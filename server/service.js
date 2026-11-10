// The business logic of the server: bring tickets in, run the workflow, record what happened, write results back.
import { runWorkflow } from '../src/workflow/runner'
import { statusFromDecision } from '../src/engine/mockAI'
import { setTransport } from '../src/engine/ai'
import { DEFAULT_SETTINGS, SAMPLE_FILES } from '../src/data/defaults'
import { makeDefaultWorkflow } from '../src/workflow/defaults'
import { createAdapter } from './adapters/index.js'
import { aiConfigured, makeTransport } from './ai.js'
import { summarizeResult } from '../src/workflow/evaluate'
import { createEgnyteClient, normalizeFolderPath } from './egnyte.js'
import { SUPPORTED, extOf, extractFileText } from './extract.js'
import { createHash } from 'node:crypto'
import { clip, nowIso, uid } from './util.js'

const MAX_BODY = 20000
const OPEN = ['pending_review', 'escalated']
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status } }

export function createService(cfg, db, { fetchImpl = fetch, seedSampleFiles = false } = {}) {
  setTransport(makeTransport(cfg.ai, fetchImpl))
  const adapter = createAdapter(cfg)
  const egnyte = cfg.egnyte.baseUrl || cfg.egnyte.token ? createEgnyteClient(cfg.egnyte, fetchImpl) : null
  let syncing = false
  let egSyncing = false
  let timer = null
  let egTimer = null

  // ---- stored documents ----
  const getSettings = () => {
    const d = db.kvGet('settings', {})
    return { ...DEFAULT_SETTINGS, ...d, ai: { ...DEFAULT_SETTINGS.ai, model: cfg.ai.defaultModel, ...(d.ai || {}) }, integrations: { ...DEFAULT_SETTINGS.integrations, ...(d.integrations || {}), zoho: { ...DEFAULT_SETTINGS.integrations.zoho, ...(d.integrations?.zoho || {}) }, egnyte: { ...DEFAULT_SETTINGS.integrations.egnyte, ...(d.integrations?.egnyte || {}) } } }
  }
  const getWorkflow = () => db.kvGet('workflow') || makeDefaultWorkflow()
  // Knowledge files = the ones people uploaded + (when Egnyte is switched on) copies synced from the linked Egnyte folder.
  const manualFiles = () => db.kvGet('files') || (seedSampleFiles ? SAMPLE_FILES : [])
  const egnyteFiles = () => db.kvGet('egnyte_files', [])
  const getFiles = () => [...manualFiles(), ...(getSettings().integrations.egnyte.enabled ? egnyteFiles() : [])]
  const log = (type, text, actor = '') => db.addActivity({ id: uid('a'), at: nowIso(), type, actor, text })

  function putConfig(key, value, actor) {
    if (key === 'settings') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Settings must be an object.')
      const eg = value.integrations?.egnyte
      if (eg) {
        let folderPath
        try { folderPath = normalizeFolderPath(eg.folderPath) } catch (e) { throw new HttpError(400, e.message) }
        value = { ...value, integrations: { ...value.integrations, egnyte: { enabled: Boolean(eg.enabled), folderPath, includeSubfolders: eg.includeSubfolders !== false } } }
        const before = getSettings().integrations.egnyte
        const after = value.integrations.egnyte
        if (after.enabled && after.folderPath && (!before.enabled || before.folderPath !== after.folderPath || before.includeSubfolders !== after.includeSubfolders)) setTimeout(() => egnyteSync({ force: true }).catch(() => {}), 50)
      }
    } else if (key === 'workflow') {
      if (!value || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) throw new HttpError(400, 'A workflow needs nodes and edges.')
    } else if (key === 'files') {
      if (!Array.isArray(value) || value.length > 500) throw new HttpError(400, 'Files must be a list (up to 500).')
      // Files synced from Egnyte belong to the sync: the browser may only switch them on or off.
      const active = new Map(value.filter((f) => f?.source === 'egnyte').map((f) => [f.id, Boolean(f.active)]))
      if (active.size) db.kvSet('egnyte_files', egnyteFiles().map((f) => (active.has(f.id) ? { ...f, active: active.get(f.id) } : f)))
      value = value.filter((f) => f?.source !== 'egnyte')
      if (JSON.stringify(value).length > 30_000_000) throw new HttpError(413, 'The knowledge files are too large (30 MB maximum).')
    } else throw new HttpError(404, 'Unknown setting.')
    db.kvSet(key, value)
    return value
  }

  // ---- Egnyte: copy the readable files of one linked folder, read-only ----
  const TOTAL_TEXT_LIMIT = 12_000_000
  const egId = (path) => `eg_${createHash('sha1').update(path).digest('hex').slice(0, 12)}`

  async function egnyteSync({ force = false } = {}) {
    const s = getSettings().integrations.egnyte
    const out = { at: nowIso(), ok: true, count: 0, skipped: [], truncated: false, error: '' }
    if (!egnyte?.configured) return { ...out, ok: false, error: `Egnyte is not configured on this server. Missing: ${(egnyte?.missing || ['EGNYTE_DOMAIN', 'EGNYTE_ACCESS_TOKEN']).join(', ')}.` }
    if (!s.enabled || !s.folderPath) return { ...out, skipped: [], note: 'Egnyte is switched off or no folder is chosen.' }
    if (egSyncing) return { ...out, note: 'A sync is already running.' }
    egSyncing = true
    try {
      const prev = new Map(egnyteFiles().map((f) => [f.path, f]))
      const found = []
      const queue = [{ path: s.folderPath, depth: 0 }]
      while (queue.length && !out.truncated) {
        const { path, depth } = queue.shift()
        let r
        try { r = await egnyte.list(path) } catch (e) { if (depth === 0) throw e; out.skipped.push({ path, reason: e.message }); continue }
        for (const f of r.files) { if (found.length >= cfg.egnyte.maxFiles) { out.truncated = true; break } found.push(f) }
        if (s.includeSubfolders && depth < 6) r.folders.forEach((d) => queue.push({ path: d.path, depth: depth + 1 }))
      }
      const next = []; let total = 0
      for (const f of found) {
        if (!SUPPORTED.includes(extOf(f.name))) { out.skipped.push({ path: f.path, reason: 'File type not supported (use PDF, Word, text, Markdown, CSV or HTML).' }); continue }
        if (f.size > cfg.egnyte.maxFileBytes) { out.skipped.push({ path: f.path, reason: `Larger than ${Math.round(cfg.egnyte.maxFileBytes / 1048576)} MB.` }); continue }
        const old = prev.get(f.path)
        try {
          let entry
          if (old && !force && old.checksum === f.checksum && old.egSize === f.size) entry = old
          else {
            const text = await extractFileText(f.name, await egnyte.download(f.path, cfg.egnyte.maxFileBytes))
            if (text.length < 20) { out.skipped.push({ path: f.path, reason: 'No readable text found (a scanned image PDF?).' }); continue }
            entry = { id: egId(f.path), name: f.name, folder: 'Egnyte', description: `Egnyte: ${f.path}`, source: 'egnyte', path: f.path, size: text.length, egSize: f.size, content: text, extracted: true, checksum: f.checksum, modified: f.modified, active: old ? old.active : true, test: false, syncedAt: nowIso() }
          }
          if (total + entry.content.length > TOTAL_TEXT_LIMIT) { out.skipped.push({ path: f.path, reason: 'Over the total size limit for synced text.' }); continue }
          total += entry.content.length
          next.push(entry)
        } catch (e) { out.skipped.push({ path: f.path, reason: e.message }) }
      }
      db.kvSet('egnyte_files', next)
      out.count = next.length
      log('system', `Egnyte sync: ${next.length} file${next.length === 1 ? '' : 's'} from ${s.folderPath}${out.skipped.length ? `, ${out.skipped.length} skipped` : ''}`, 'system')
    } catch (e) { out.ok = false; out.error = e.message; log('system', `Egnyte sync failed: ${e.message}`, 'system') }
    finally { egSyncing = false; out.skipped = out.skipped.slice(0, 50); db.kvSet('egnyte_state', out) }
    return out
  }
  async function egnyteFolders(path) {
    if (!egnyte?.configured) throw new HttpError(503, `Egnyte is not configured on this server. Missing: ${(egnyte?.missing || ['EGNYTE_DOMAIN', 'EGNYTE_ACCESS_TOKEN']).join(', ')}.`)
    let p
    try { p = normalizeFolderPath(path) || '/' } catch (e) { throw new HttpError(400, e.message) }
    try { const r = await egnyte.list(p); return { path: p, folders: r.folders, files: r.files.length } } catch (e) { throw new HttpError(e.status === 401 ? 401 : 502, e.message) }
  }
  async function testEgnyte() {
    if (!egnyte?.configured) return { ok: false, detail: `Missing settings: ${(egnyte?.missing || ['EGNYTE_DOMAIN', 'EGNYTE_ACCESS_TOKEN']).join(', ')}.` }
    try { return await egnyte.health() } catch (e) { return { ok: false, detail: e.message } }
  }
  function purgeEgnyte(actor) { db.kvSet('egnyte_files', []); db.kvSet('egnyte_state', null); log('system', `${actor} removed the synced Egnyte copies`, actor) }

  // ---- running one message through the workflow ----
  async function processEmail(email, { exclude } = {}) {
    const settings = getSettings()
    const history = db.listEmails(200).filter((e) => e.id !== exclude)
    const result = await runWorkflow({ email, workflow: getWorkflow(), settings, files: getFiles(), history })
    let status = statusFromDecision(result.decision)
    const at = nowIso()
    const hist = [{ at, text: email.source === 'zoho' ? `Ticket ${email.ticketNumber ? `#${email.ticketNumber} ` : ''}received from Zoho Desk` : email.source === 'import' ? 'Request imported' : email.source === 'eval' ? 'Evaluation run' : 'Test email received' }]
    let finalReply = null
    if (status === 'auto_sent') {
      const zoho = settings.integrations.zoho
      const canSend = email.source === 'zoho' && cfg.allowAutoSend && adapter?.configured && zoho.onApprove === 'send_reply'
      if (email.source === 'import') { status = 'pending_review'; hist.push({ at, text: 'Imported requests are never sent automatically, so a person must approve it.' }) }
      else if (email.source === 'test' || email.source === 'eval') { finalReply = result.draft; hist.push({ at, text: 'Reply sent automatically (simulated, nothing really sent)' }) }
      else if (canSend) {
        try { await adapter.sendReply(email.ticketId, { to: email.from, text: result.draft }); finalReply = result.draft; hist.push({ at, text: 'Reply sent automatically through Zoho Desk' }) } catch (e) {
          status = 'pending_review'; hist.push({ at, text: `Automatic send failed (${e.message}), so a person must approve it.` })
        }
      } else { status = 'pending_review'; hist.push({ at, text: 'The workflow reached "Email sent", but automatic sending is switched off on this server, so a person must approve it.' }) }
    } else hist.push({ at, text: status === 'escalated' ? 'Escalated to a person' : status === 'discarded' ? 'Closed without a reply' : 'Draft created, waiting for review' })
    return { ...email, result, status, finalReply, history: hist }
  }

  /** After a ticket is processed: put the draft and the workflow's ticket actions onto the ticket in Zoho Desk. */
  async function syncToTicket(rec) {
    const z = getSettings().integrations.zoho
    const out = []
    const run = async (label, fn) => { try { await fn(); out.push(`${label}: done`) } catch (e) { out.push(`${label}: FAILED (${e.message})`) } }
    if (z.noteDraftOnArrival && rec.result.draft) {
      const flags = rec.result.flags.length ? `Flagged: ${rec.result.flags.map((f) => f.name).join(', ')}.\n` : ''
      await run('Draft note', () => adapter.addInternalNote(rec.ticketId, `AI-prepared draft for review. NOT sent to the employee.\n${flags}Confidence: ${rec.result.confidence}%.\n\n${rec.result.draft}`))
    }
    if (z.applyTicketActions) {
      for (const a of rec.result.ticketActions) {
        if (a.type === 'status') await run(`Set status "${a.value}"`, () => adapter.setStatus(rec.ticketId, a.value))
        if (a.type === 'tags' && a.value.length) await run(`Add tags ${a.value.join(', ')}`, () => adapter.addTags(rec.ticketId, a.value))
        if (a.type === 'assign') await run(`Assign to ${a.value}`, () => adapter.assign(rec.ticketId, a.value))
      }
    }
    if (out.length) rec.history.push({ at: nowIso(), text: `Zoho Desk ticket updated. ${out.join('; ')}` })
    rec.ticketSync = out
  }

  async function ingestOnce() {
    const settings = getSettings()
    const status = { at: nowIso(), ok: true, count: 0, error: '' }
    if (syncing) return { ...status, skipped: 'A sync is already running.' }
    if (!adapter) return { ...status, skipped: 'No ticketing system is configured on this server.' }
    if (!adapter.configured) return { ...status, ok: false, error: `Zoho Desk is not fully configured. Missing: ${adapter.missing.join(', ')}.` }
    if (!settings.integrations.zoho.enabled) return { ...status, skipped: 'Pulling tickets is switched off in Settings.' }
    syncing = true
    try {
      let since = db.kvGet('ingest_since')
      if (!since) { since = new Date(Date.now() - cfg.ticketing.backfillDays * 864e5).toISOString(); db.kvSet('ingest_since', since); log('system', `Ticket intake started. Tickets created from ${since} onward will be picked up.`) }
      for (const t of await adapter.listNewTickets({ since, isKnown: (id) => Boolean(db.emailIdForTicket(id)) })) {
        if (db.emailIdForTicket(t.id)) continue
        const email = { id: uid('e'), ticketId: t.id, ticketNumber: t.number, ticketUrl: t.url, source: 'zoho', name: clip(t.name, 120), from: clip(t.from, 200), subject: clip(t.subject, 300), body: clip(t.body, MAX_BODY), attachments: t.attachments || [], receivedAt: t.receivedAt }
        const rec = await processEmail(email)
        try { await syncToTicket(rec) } catch (e) { rec.history.push({ at: nowIso(), text: `Could not update the Zoho Desk ticket: ${e.message}` }) }
        db.putEmail(rec)
        log('email', `Ticket "${rec.subject}" processed: ${rec.status.replace('_', ' ')}`, 'system')
        rec.result.alerts.forEach((a) => log('alert', `Alert to ${a.role}: ${a.message} ("${rec.subject}")`, 'system'))
        status.count += 1
      }
    } catch (e) { status.ok = false; status.error = e.message; log('system', `Ticket sync failed: ${e.message}`, 'system') }
    finally { syncing = false; db.kvSet('last_sync', status) }
    return status
  }

  // ---- reviewer actions ----
  const need = (id) => { const e = db.getEmail(id); if (!e) throw new HttpError(404, 'That message no longer exists.'); return e }

  async function testEmail(input, actor) {
    const email = { id: uid('e'), attachments: [], name: clip(input.name || 'Test Person', 120), from: clip(input.from || 'test.person@example.com', 200), subject: clip(input.subject || '(no subject)', 300), body: clip(input.body || '', MAX_BODY), receivedAt: nowIso(), source: 'test' }
    const rec = await processEmail(email)
    db.putEmail(rec)
    log('email', `Test email "${rec.subject}" processed: ${rec.status.replace('_', ' ')}`, actor)
    rec.result.alerts.forEach((a) => log('alert', `Alert to ${a.role}: ${a.message} ("${rec.subject}")`, actor))
    return rec
  }

  // ---- importing requests without a ticketing system, and measuring accuracy ----
  function buildEmail(row, source) {
    const body = clip(String(row?.body || '').trim(), MAX_BODY)
    if (!body) throw new HttpError(400, 'A request needs message text.')
    const t = Date.parse(row.receivedAt)
    return { id: uid('e'), attachments: [], source, name: clip(row.name || 'Employee', 120), from: clip(row.from || 'unknown@example.com', 200), subject: clip(row.subject || body.slice(0, 60), 300), body, receivedAt: Number.isFinite(t) ? new Date(t).toISOString() : nowIso() }
  }
  async function importRequest(row, actor) {
    const rec = await processEmail(buildEmail(row, 'import'))
    db.putEmail(rec)
    log('email', `Imported request "${rec.subject}" processed: ${rec.status.replace('_', ' ')}`, actor)
    rec.result.alerts.forEach((a) => log('alert', `Alert to ${a.role}: ${a.message} ("${rec.subject}")`, actor))
    return rec
  }
  /** Runs the whole workflow on one request and returns a summary. Nothing is stored, so it never touches the review queue. */
  async function evaluateRequest(row) {
    const rec = await processEmail(buildEmail(row, 'eval'))
    return summarizeResult(rec, { expectedTopic: row.expectedTopic, expectedRisk: row.expectedRisk })
  }
  function saveEvalRun(run, actor) {
    if (!run || !Array.isArray(run.rows) || run.rows.length === 0 || run.rows.length > 300) throw new HttpError(400, 'That evaluation run is not valid.')
    const slim = { id: uid('r'), at: nowIso(), by: actor, name: clip(run.name || 'Evaluation', 80), model: clip(run.model || '', 80), rows: run.rows.map((r) => ({ ...r, draft: clip(r.draft, 1200), subject: clip(r.subject, 200), name: clip(r.name, 120) })) }
    const runs = [slim, ...db.kvGet('eval_runs', [])].slice(0, 20)
    db.kvSet('eval_runs', runs); log('system', `${actor} saved an accuracy check of ${slim.rows.length} requests`, actor)
    return slim
  }

  async function resolve(id, kind, text, actor) {
    const e = need(id)
    if (!OPEN.includes(e.status)) throw new HttpError(409, 'That message has already been handled.')
    const at = nowIso()
    if (kind === 'discard') {
      e.status = 'discarded'; e.history.push({ at, text: `Closed without sending a reply (${actor})` })
      db.putEmail(e); log('review', `${actor} closed "${e.subject}" without replying`, actor); return e
    }
    if (kind !== 'send') throw new HttpError(400, 'Unknown action.')
    const reply = String(text || '').trim()
    if (!reply) throw new HttpError(400, 'The reply is empty.')
    let how = e.source === 'import' ? 'approved and recorded here. Send the reply from your own email or help desk' : 'recorded (simulated, nothing really sent)'
    if (e.source === 'zoho') {
      const mode = getSettings().integrations.zoho.onApprove
      if (!adapter?.configured) throw new HttpError(503, 'Zoho Desk is not connected, so the reply cannot be written to the ticket.')
      try {
        if (mode === 'send_reply') { await adapter.sendReply(e.ticketId, { to: e.from, text: reply }); how = 'sent to the employee through Zoho Desk' }
        else if (mode === 'internal_note') { await adapter.addInternalNote(e.ticketId, `Reply approved by ${actor}. Send it from this ticket:\n\n${reply}`); how = 'saved as a private note on the Zoho Desk ticket, ready to send' }
        else how = 'approved (not written to Zoho Desk, as set in Settings)'
      } catch (err) { throw new HttpError(502, `Zoho Desk did not accept the reply: ${err.message}. Nothing was changed. Try again.`) }
    }
    e.status = 'approved_sent'; e.finalReply = reply; e.wasEdited = reply !== String(e.result.draft || '').trim()
    e.history.push({ at, text: `Reviewed and approved by ${actor}; ${how}` })
    db.putEmail(e); log('review', `${actor} approved a reply to "${e.subject}": ${how}`, actor)
    return e
  }

  function addNote(id, text, actor) {
    const e = need(id)
    const t = clip(String(text || '').trim(), 5000)
    if (!t) throw new HttpError(400, 'The note is empty.')
    e.notes = [...(e.notes || []), { id: uid('n'), at: nowIso(), text: t, by: actor }]
    db.putEmail(e); log('review', `${actor} added a case note to "${e.subject}"`, actor); return e
  }
  function saveDraft(id, text) { const e = need(id); e.editedDraft = clip(String(text ?? ''), 20000); db.putEmail(e); return e }
  async function regenerate(id, actor) {
    const e = need(id)
    if (!OPEN.includes(e.status)) throw new HttpError(409, 'That message has already been handled.')
    const next = await processEmail(e, { exclude: id })
    const merged = { ...e, result: next.result, editedDraft: undefined, status: next.status === 'auto_sent' ? 'pending_review' : next.status, history: [...e.history, { at: nowIso(), text: `Draft regenerated with current settings (${actor})` }] }
    db.putEmail(merged); return merged
  }
  function deleteEmail(id, actor) {
    const e = need(id)
    if (e.source === 'zoho') throw new HttpError(409, 'Tickets from Zoho Desk are kept for the record. Close the message instead.')
    db.deleteEmail(id); log('system', `${actor} deleted a test email`, actor)
  }

  // ---- status for the Settings page ----
  const status = () => {
    const s = getSettings()
    return {
      ticketing: { adapter: cfg.ticketing.adapter, configured: Boolean(adapter?.configured), missing: adapter?.missing || [], enabled: s.integrations.zoho.enabled, pollSeconds: cfg.ticketing.pollSeconds, lastSync: db.kvGet('last_sync') },
      ai: { configured: aiConfigured(cfg.ai), provider: new URL(cfg.ai.baseUrl).host, kind: cfg.ai.provider, model: getSettings().ai.model },
      allowAutoSend: cfg.allowAutoSend,
      egnyte: { configured: Boolean(egnyte?.configured), missing: egnyte?.missing || ['EGNYTE_DOMAIN', 'EGNYTE_ACCESS_TOKEN'], enabled: s.integrations.egnyte.enabled, folderPath: s.integrations.egnyte.folderPath, syncMinutes: cfg.egnyte.syncMinutes, lastSync: db.kvGet('egnyte_state'), fileCount: s.integrations.egnyte.enabled ? egnyteFiles().length : 0 },
    }
  }
  async function testTicketing() {
    if (!adapter) return { ok: false, detail: 'No ticketing system is configured. Set TICKETING_ADAPTER=zohodesk and the ZOHO_* variables.' }
    if (!adapter.configured) return { ok: false, detail: `Missing settings: ${adapter.missing.join(', ')}.` }
    try { return await adapter.health() } catch (e) { return { ok: false, detail: e.message } }
  }

  function start() {
    if (adapter && !timer) {
      const tick = () => ingestOnce().catch((e) => console.error('sync error', e.message))
      setTimeout(tick, 5000).unref?.()
      timer = setInterval(tick, cfg.ticketing.pollSeconds * 1000)
      timer.unref?.()
    }
    if (egnyte && !egTimer) {
      const tick = () => egnyteSync().catch((e) => console.error('egnyte error', e.message))
      setTimeout(tick, 10_000).unref?.()
      egTimer = setInterval(tick, cfg.egnyte.syncMinutes * 60_000)
      egTimer.unref?.()
    }
  }
  const stop = () => { if (timer) clearInterval(timer); if (egTimer) clearInterval(egTimer); timer = null; egTimer = null }

  return { adapter, getSettings, getWorkflow, getFiles, putConfig, log, processEmail, ingestOnce, testEmail, importRequest, evaluateRequest, saveEvalRun, resolve, addNote, saveDraft, regenerate, deleteEmail, status, testTicketing, egnyteSync, egnyteFolders, testEgnyte, purgeEgnyte, start, stop }
}
