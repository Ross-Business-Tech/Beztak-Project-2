// Saving and loading whole-workflow presets.
//  - "This browser": always works (localStorage).
//  - "Team": shared through the site's here.now Site Data (collection "presets", see public/.herenow/data.json).
//    The team collection is append-only: anyone with the site can ADD a record, nobody can edit or delete one.
//    Changing or deleting a preset adds a new, newer version (a delete is a "tombstone"), and the newest version wins.
//    Everything read back is treated as untrusted and checked in sanitizeWorkflow() before it is used.

import { CATEGORIES, DEFAULT_SETTINGS, SEVERITIES } from '../data/defaults'
import { BLOCKS, FIELDS, portsOf } from './blocks'

const LOCAL_KEY = 'hr-helpdesk-presets-v1'
const AUTHOR_KEY = 'hr-helpdesk-author'
const TEAM_URL = './.herenow/data/presets'
const MAX_FIELD = 14000
const MAX_UNPACKED = 300000

// ---------------- checking untrusted workflows ----------------
const str = (v, d = '', max = 400) => (typeof v === 'string' ? v.slice(0, max) : d)
const strs = (v, max = 60) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.slice(0, 120)).slice(0, max) : [])
const oneOf = (v, list, d) => (list.includes(v) ? v : d)
const bool = (v, d) => (typeof v === 'boolean' ? v : d)

function cleanConfig(kind, raw, base) {
  const c = { ...base, ...(raw && typeof raw === 'object' ? raw : {}) }
  switch (kind) {
    case 'filter_flag':
      c.careful = bool(c.careful, true); c.semantic = bool(c.semantic, true)
      c.rules = (Array.isArray(c.rules) ? c.rules : []).slice(0, 30).map((r, i) => ({
        id: str(r?.id, `r_${i}`, 40), name: str(r?.name, 'Rule', 80), description: str(r?.description, '', 400),
        keywords: strs(r?.keywords, 80), severity: oneOf(r?.severity, SEVERITIES.map((s) => s.id), 'high'), notify: str(r?.notify, 'HR Business Partner', 80),
      }))
      if (!c.rules.length) c.rules = base.rules
      break
    case 'filter_text': c.where = oneOf(c.where, ['both', 'subject', 'body', 'sender'], 'both'); c.words = strs(c.words); c.mode = oneOf(c.mode, ['any', 'all'], 'any'); break
    case 'if': case 'while':
      c.join = oneOf(c.join, ['all', 'any'], 'all')
      c.conditions = (Array.isArray(c.conditions) ? c.conditions : []).slice(0, 12)
        .filter((x) => x && FIELDS[x.field]).map((x) => ({ field: x.field, op: str(x.op, '=', 20), value: Array.isArray(x.value) ? strs(x.value) : (typeof x.value === 'number' ? x.value : str(x.value, '', 200)) }))
      if (kind === 'while') c.maxLoops = Math.max(1, Math.min(5, Math.round(Number(c.maxLoops)) || 2))
      break
    case 'switch_topic': c.topics = strs(c.topics).filter((t) => CATEGORIES.some((k) => k.id === t)); break
    case 'ai_draft': c.tone = oneOf(c.tone, ['default', 'warm', 'professional', 'concise'], 'default'); break
    case 'alert': c.role = str(c.role, 'HR Director', 80); c.message = str(c.message, '', 300); break
    case 'email_out': c.requireApproval = bool(c.requireApproval, true); break
    case 'review': c.priority = oneOf(c.priority, ['normal', 'urgent'], 'normal'); c.requireConfirm = bool(c.requireConfirm, false); break
    case 'assign': c.owner = str(c.owner, 'HR Director', 80); c.priority = oneOf(c.priority, ['normal', 'urgent'], 'urgent'); c.requireConfirm = bool(c.requireConfirm, true); break
    case 'close': c.reason = str(c.reason, '', 200); break
    default: break
  }
  return c
}

/** Check a workflow that came from outside and rebuild it from known-safe parts. */
export function sanitizeWorkflow(raw) {
  if (!raw || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return { ok: false, error: 'This is not a workflow.' }
  if (raw.nodes.length > 80 || raw.edges.length > 200) return { ok: false, error: 'This workflow is too large.' }
  const ids = new Set(); const nodes = []
  for (const n of raw.nodes) {
    const kind = n?.data?.kind
    if (!BLOCKS[kind]) return { ok: false, error: 'It contains a block type this version does not know.' }
    if (typeof n.id !== 'string' || n.id.length > 60 || ids.has(n.id)) return { ok: false, error: 'It contains an invalid block.' }
    ids.add(n.id)
    nodes.push({
      id: n.id, type: 'block', position: { x: Math.round(Number(n.position?.x)) || 0, y: Math.round(Number(n.position?.y)) || 0 },
      data: { kind, label: str(n.data.label, '', 60), config: cleanConfig(kind, n.data.config, BLOCKS[kind].defaults()) },
    })
  }
  if (nodes.filter((n) => n.data.kind === 'email_in').length !== 1) return { ok: false, error: 'A workflow needs exactly one Email received block.' }
  const byId = new Map(nodes.map((n) => [n.id, n])); const used = new Set(); const edges = []
  for (const e of raw.edges) {
    const a = byId.get(e?.source); const b = byId.get(e?.target)
    if (!a || !b || BLOCKS[b.data.kind].hasInput === false) continue
    if (!portsOf(a).some((p) => p.id === e.sourceHandle)) continue
    const key = `${a.id}|${e.sourceHandle}`
    if (used.has(key)) continue
    used.add(key)
    edges.push({ id: str(e.id, `e_${edges.length}`, 80), source: a.id, sourceHandle: e.sourceHandle, target: b.id, targetHandle: 'in' })
  }
  return { ok: true, workflow: { nodes, edges } }
}

/** Settings that came from outside: keep only known fields, with safe types. */
export function sanitizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return null
  const d = DEFAULT_SETTINGS
  const zr = raw.integrations?.zoho ?? raw.integrations?.zoro // older presets used the key "zoro"
  const z = zr && typeof zr === 'object' ? zr : {}
  const model = typeof raw.ai?.model === 'string' && /^[\w.\-/:]{1,100}$/.test(raw.ai.model) ? raw.ai.model : d.ai.model
  return {
    tone: oneOf(raw.tone, ['warm', 'professional', 'concise'], d.tone),
    helpDeskName: str(raw.helpDeskName, d.helpDeskName, 80), replyToAddress: str(raw.replyToAddress, d.replyToAddress, 120),
    signature: str(raw.signature, d.signature, 400), footer: str(raw.footer, d.footer, 500), includeFooter: bool(raw.includeFooter, d.includeFooter),
    minutesSavedPerReply: Math.max(1, Math.min(60, Math.round(Number(raw.minutesSavedPerReply)) || d.minutesSavedPerReply)),
    ai: { engine: oneOf(raw.ai?.engine, ['ai', 'simulated'], d.ai.engine), model },
    integrations: { zoho: { enabled: bool(z.enabled, false), applyTicketActions: bool(z.applyTicketActions, true), noteDraftOnArrival: bool(z.noteDraftOnArrival, true), onApprove: oneOf(z.onApprove, ['internal_note', 'send_reply', 'none'], 'internal_note') } },
  }
}

/** What a saved preset contains: the workflow and (for full presets) the Settings. Older presets hold only a workflow. */
export function sanitizePayload(raw) {
  const wf = sanitizeWorkflow(raw && raw.workflow ? raw.workflow : raw)
  if (!wf.ok) return wf
  return { ok: true, workflow: wf.workflow, settings: raw && raw.workflow ? sanitizeSettings(raw.settings) : null }
}

// ---------------- packing (keeps records under the 16 KB limit) ----------------
const toB64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(s) }

export async function pack(workflow) {
  const json = JSON.stringify(workflow)
  if (json.length <= MAX_FIELD) return { enc: 'json', workflow: json }
  if (typeof CompressionStream === 'undefined') return null
  const buf = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()
  const b64 = toB64(new Uint8Array(buf))
  return b64.length <= MAX_FIELD ? { enc: 'gzip', workflow: b64 } : null
}

export async function unpack(enc, text) {
  if (enc !== 'gzip') return JSON.parse(text)
  const bin = Uint8Array.from(atob(text), (c) => c.charCodeAt(0))
  const reader = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip')).getReader()
  const parts = []; let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > MAX_UNPACKED) { reader.cancel(); throw new Error('too large') }
    parts.push(value)
  }
  return JSON.parse(new TextDecoder().decode(await new Blob(parts).arrayBuffer()))
}

// ---------------- this browser ----------------
export function loadLocal() {
  try { const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
export function saveLocal(list) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); return true } catch { return false }
}
export const getAuthor = () => { try { return localStorage.getItem(AUTHOR_KEY) || '' } catch { return '' } }
export const setAuthor = (v) => { try { localStorage.setItem(AUTHOR_KEY, v) } catch { /* ignore */ } }

// ---------------- the team ----------------
const REASONS = {
  not_set_up: 'Team sharing is not switched on for this link. It works on the team site once your instructor publishes it there.',
  account_required: 'Team sharing needs a site that belongs to the team, not a temporary test link.',
  rate: 'Too many saves in a short time. Try again in a few minutes.',
  network: 'Could not reach the team store. Check your connection.',
  too_big: 'This workflow is too large to share with the team.',
  error: 'The team store returned an unexpected answer.',
}
export const reasonText = (r) => REASONS[r] || REASONS.error

async function readError(res) {
  if (res.status === 404 || res.status === 405) return 'not_set_up'
  if (res.status === 403) return 'account_required'
  if (res.status === 429) return 'rate'
  return 'error'
}

/** Newest version of every preset the team has saved. */
export async function teamList() {
  let res
  try { res = await fetch(TEAM_URL, { headers: { Accept: 'application/json' } }) } catch { return { ok: false, reason: 'network' } }
  if (!res.ok) return { ok: false, reason: await readError(res) }
  if ((res.headers.get('content-type') || '').includes('text/html')) return { ok: false, reason: 'not_set_up' }
  let body
  try { body = await res.json() } catch { return { ok: false, reason: 'error' } }
  const records = Array.isArray(body) ? body : (body.records || body.items || [])
  const newest = new Map()
  for (const r of records) {
    const d = r && typeof r === 'object' ? (r.data && typeof r.data === 'object' ? r.data : r) : null
    if (!d || typeof d.key !== 'string') continue
    const rec = { key: d.key.slice(0, 64), name: str(d.name, 'Untitled', 80), description: str(d.description, '', 300), author: str(d.author, '', 80), savedAt: str(d.saved_at, '', 40), enc: d.enc === 'gzip' ? 'gzip' : 'json', full: d.full === true, workflow: str(d.workflow, '', MAX_FIELD + 100), deleted: d.deleted === true }
    const prev = newest.get(rec.key)
    if (!prev || rec.savedAt >= prev.savedAt) newest.set(rec.key, rec)
  }
  const list = [...newest.values()].filter((r) => !r.deleted && r.workflow).sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)).slice(0, 60)
  return { ok: true, presets: list }
}

async function teamPost(fields) {
  let res
  try { res = await fetch(TEAM_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) }) } catch { return { ok: false, reason: 'network' } }
  if (!res.ok) return { ok: false, reason: await readError(res) }
  if ((res.headers.get('content-type') || '').includes('text/html')) return { ok: false, reason: 'not_set_up' }
  return { ok: true }
}

/** Save (or save a newer version of) a preset for the whole team. */
export async function teamSave(p) { return teamPost({ key: p.key, name: p.name, description: p.description, author: p.author, saved_at: p.savedAt, enc: p.enc, full: p.full === true, workflow: p.workflow, deleted: false }) }
/** Remove a preset for the team by adding a newer "deleted" version. */
export async function teamRemove(p) { return teamPost({ key: p.key, name: p.name, description: '', author: p.author || '', saved_at: new Date().toISOString(), enc: 'json', full: false, workflow: '', deleted: true }) }
