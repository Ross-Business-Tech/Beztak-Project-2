// Settings cards that only exist when the app runs against the self-hosted server.
import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { api } from '../serverApi'
import { Badge, Card, Field, Icon, Modal, SettingRow, Toggle } from './ui'

const when = (iso) => (iso ? new Date(iso).toLocaleString() : 'never')

export function ZohoCard() {
  const { settings: s, updateSettings, status, refresh, isAdmin } = useApp()
  const z = s.integrations.zoho
  const t = status.ticketing
  const [busy, setBusy] = useState('')
  const [result, setResult] = useState(null)
  const setZ = (patch, note) => updateSettings({ integrations: { ...s.integrations, zoho: { ...z, ...patch } } }, note)
  async function run(kind) {
    setBusy(kind); setResult(null)
    try { setResult(await api('POST', `/api/integrations/${kind}`, {})); if (kind === 'sync') await refresh() } catch (e) { setResult({ ok: false, error: e.message }) } finally { setBusy('') }
  }
  const last = t.lastSync
  return (
    <Card title="Connection to Zoho Desk" hint="Where HR requests arrive and where results go. Credentials are set on the server, never in the browser.">
      <SettingRow title="Connection status" hint={t.adapter === 'none' ? 'Not connected. Zoho Desk is optional: without it, bring requests in with Import and evaluate.' : t.configured ? 'The connection details are in place.' : 'Setup is not finished yet. Ask your administrator.'}>
        {t.adapter === 'none' ? <Badge tone="amber">Not connected</Badge> : t.configured ? <Badge tone="green">Ready</Badge> : <Badge tone="red">Incomplete</Badge>}
      </SettingRow>
      {!t.configured && (
        <details className="tech"><summary>Technical details for your administrator</summary>
          <p className="small muted" style={{ marginTop: 6 }}>{t.adapter === 'none' ? 'No ticketing system is configured on this server. Set TICKETING_ADAPTER=zohodesk and the ZOHO_ variables (see docs/zoho-desk.md).' : `Missing on the server: ${t.missing.join(', ')}.`}</p>
        </details>
      )}
      <SettingRow title="Pull new tickets" hint="Checks Zoho Desk every few minutes for new tickets in the HR queue. Turn this off to pause everything.">
        <Toggle label="Pull tickets" checked={z.enabled} onChange={(v) => setZ({ enabled: v }, `Pulling tickets from Zoho Desk turned ${v ? 'on' : 'off'}`)} />
      </SettingRow>
      <SettingRow title="Save the AI draft as a private note" hint="When a ticket arrives, add the AI draft to it as an internal note. Staff see it in Zoho Desk. It is never sent to the employee.">
        <Toggle label="Draft note" checked={z.noteDraftOnArrival} onChange={(v) => setZ({ noteDraftOnArrival: v })} />
      </SettingRow>
      <SettingRow title="Let the workflow update the ticket" hint="Lets the workflow's status, tag and assign blocks change the real ticket.">
        <Toggle label="Apply ticket actions" checked={z.applyTicketActions} onChange={(v) => setZ({ applyTicketActions: v })} />
      </SettingRow>
      <SettingRow title="When a person approves a reply" hint="Private note is the safest: HR sends the reply from Zoho Desk. Send reply emails the employee straight away.">
        <select aria-label="When a reply is approved" value={z.onApprove} onChange={(e) => setZ({ onApprove: e.target.value }, `Approved replies now: ${e.target.value}`)}>
          <option value="internal_note">Save as a private note on the ticket</option>
          <option value="send_reply">Email the employee through Zoho Desk</option>
          <option value="none">Only record it here</option>
        </select>
      </SettingRow>
      <SettingRow title="Automatic sending" hint={status.allowAutoSend ? 'Allowed on this server. The workflow decides which messages qualify.' : 'Off on this server. Every reply waits for a person. An administrator can allow it with ALLOW_AUTO_SEND=true.'}>
        <Badge tone={status.allowAutoSend ? 'amber' : 'green'}>{status.allowAutoSend ? 'Allowed' : 'Off'}</Badge>
      </SettingRow>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" disabled={!isAdmin || busy} onClick={() => run('test')}>{busy === 'test' ? 'Testing...' : 'Test connection'}</button>
        <button className="btn" disabled={!isAdmin || busy} onClick={() => run('sync')}>{busy === 'sync' ? 'Checking...' : 'Check for tickets now'}</button>
        {result && (result.skipped ? <span className="muted small">{result.skipped}</span> : result.detail !== undefined ? <span className="small"><Badge tone={result.ok ? 'green' : 'red'}>{result.ok ? 'Connected' : 'Problem'}</Badge> {result.detail}</span>
          : <span className="small"><Badge tone={result.ok ? 'green' : 'red'}>{result.ok ? 'Done' : 'Problem'}</Badge> {result.ok ? `${result.count} new ticket${result.count === 1 ? '' : 's'}.` : result.error}</span>)}
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>Last check: {when(last?.at)}{last ? (last.ok ? `, ${last.count} new ticket${last.count === 1 ? '' : 's'}.` : `, failed: ${last.error}`) : '.'} Checks run every {Math.round(t.pollSeconds / 60) || 1} minute(s). AI provider: {status.ai.configured ? <>{status.ai.provider}</> : <strong>not configured, so the simple built-in writer is used</strong>}.</p>
    </Card>
  )
}

export function TeamCard() {
  const { toast, user } = useApp()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ username: '', password: '', role: 'reviewer' })
  const load = () => api('GET', '/api/users').then((r) => setUsers(r.users)).catch(() => {})
  useEffect(() => { load() }, [])
  async function add(e) {
    e.preventDefault()
    try { await api('POST', '/api/users', form); setForm({ username: '', password: '', role: 'reviewer' }); toast('Account created'); load() } catch (err) { toast(err.message, 'warn') }
  }
  async function remove(u) {
    if (!window.confirm(`Remove ${u.username}?`)) return
    try { await api('DELETE', `/api/users/${u.id}`); toast('Account removed'); load() } catch (err) { toast(err.message, 'warn') }
  }
  return (
    <Card title="Team" hint="Reviewers can review and approve replies. Admins can also change settings, the workflow and documents.">
      <div className="list" style={{ marginBottom: 14 }}>
        {users.map((u) => (
          <div key={u.id} className="item" style={{ cursor: 'default' }}>
            <div className="body"><div className="cell-title">{u.username} {u.id === user.id && <span className="muted small">(you)</span>}</div></div>
            <Badge tone={u.role === 'admin' ? 'blue' : undefined}>{u.role === 'admin' ? 'Admin' : 'Reviewer'}</Badge>
            {u.id !== user.id && <button className="btn small danger" onClick={() => remove(u)}>Remove</button>}
          </div>
        ))}
      </div>
      <form onSubmit={add}>
        <div className="two-col">
          <Field label="Username">{(id) => <input id={id} type="text" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" />}</Field>
          <Field label="Temporary password" hint="At least 10 characters.">{(id) => <input id={id} type="password" required minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />}</Field>
        </div>
        <Field label="Role">{(id) => <select id={id} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="reviewer">Reviewer</option><option value="admin">Admin</option></select>}</Field>
        <button className="btn primary" type="submit">Add person</button>
      </form>
    </Card>
  )
}

export function PasswordCard() {
  const { toast } = useApp()
  const [f, setF] = useState({ current: '', next: '' })
  async function submit(e) {
    e.preventDefault()
    try { await api('POST', '/api/password', f); setF({ current: '', next: '' }); toast('Password changed') } catch (err) { toast(err.message, 'warn') }
  }
  return (
    <Card title="Your password">
      <form onSubmit={submit}>
        <div className="two-col">
          <Field label="Current password">{(id) => <input id={id} type="password" required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoComplete="current-password" />}</Field>
          <Field label="New password" hint="At least 10 characters.">{(id) => <input id={id} type="password" required minLength={10} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} autoComplete="new-password" />}</Field>
        </div>
        <button className="btn" type="submit">Change password</button>
      </form>
    </Card>
  )
}

export function EgnyteCard() {
  const { settings: s, updateSettings, status, reloadFiles, watchEgnyte, isAdmin, toast } = useApp()
  const cfg = s.integrations.egnyte
  const st = status.egnyte
  const [draft, setDraft] = useState(cfg.folderPath)
  const [busy, setBusy] = useState('')
  const [result, setResult] = useState(null)
  const [pick, setPick] = useState(null) // { path, folders, files, error, loading }
  const [confirm, setConfirm] = useState(false)
  const set = (patch, note) => { updateSettings({ integrations: { ...s.integrations, egnyte: { ...cfg, ...patch } } }, note); watchEgnyte() }

  async function browse(path) {
    setPick((p) => ({ ...(p || {}), path, loading: true, error: '' }))
    try { const r = await api('GET', `/api/egnyte/folders?path=${encodeURIComponent(path)}`); setPick({ ...r, loading: false, error: '' }) } catch (e) { setPick((p) => ({ ...(p || {}), path, folders: [], loading: false, error: e.message })) }
  }
  async function run(kind) {
    setBusy(kind); setResult(null)
    try { setResult(await api('POST', `/api/egnyte/${kind}`, {})); if (kind === 'sync') await reloadFiles() } catch (e) { setResult({ ok: false, error: e.message }) } finally { setBusy('') }
  }
  const commit = (path) => { setDraft(path); set({ folderPath: path }, `Egnyte folder set to ${path}`); setPick(null) }
  const last = st.lastSync
  return (
    <Card title="Egnyte documents" hint="Let the AI answer from a folder in Egnyte. Read-only: nothing in Egnyte is ever changed.">
      <SettingRow title="Connection status" hint={st.configured ? 'The connection details are in place.' : 'Not connected yet. Ask your administrator to finish the Egnyte setup.'}>
        <Badge tone={st.configured ? 'green' : 'amber'}>{st.configured ? 'Ready' : 'Not connected'}</Badge>
      </SettingRow>
      {!st.configured && (
        <details className="tech"><summary>Technical details for your administrator</summary>
          <p className="small muted" style={{ marginTop: 6 }}>Missing on the server: {st.missing.join(', ')}. See docs/egnyte.md.</p>
        </details>
      )}
      <div className="guardrail" role="note"><Icon name="lock" /><div>Link a folder that holds only policies and guides that are fine to quote to employees. The AI reads relevant passages of these files and may quote them in drafted replies. Do not link folders with case files, personal records or pay data.</div></div>
      <div style={{ marginTop: 12 }} />
      <Field label="Folder to use" hint="The full Egnyte path, for example /Shared/HR/Policies. Use Browse to pick it.">
        {(id) => (
          <div className="row">
            <input id={id} type="text" className="grow" value={draft} placeholder="/Shared/HR/Policies" onChange={(e) => setDraft(e.target.value)} disabled={!isAdmin} />
            <button className="btn" disabled={!isAdmin || !st.configured} onClick={() => browse(draft || '/')}>Browse</button>
            <button className="btn" disabled={!isAdmin || draft === cfg.folderPath} onClick={() => commit(draft.trim())}>Save folder</button>
          </div>
        )}
      </Field>
      <SettingRow title="Use these documents" hint={cfg.folderPath ? `Copies readable files from ${cfg.folderPath} and keeps them up to date (checked every ${st.syncMinutes} minutes).` : 'Choose and save a folder first.'}>
        <Toggle label="Use Egnyte documents" checked={cfg.enabled} onChange={(v) => { if (v && !cfg.folderPath) { toast('Choose and save a folder first.', 'warn'); return } set({ enabled: v }, `Egnyte documents turned ${v ? 'on' : 'off'}`) }} />
      </SettingRow>
      <SettingRow title="Include sub-folders" hint="Reads folders inside the chosen folder too (up to 6 levels deep).">
        <Toggle label="Include sub-folders" checked={cfg.includeSubfolders} onChange={(v) => set({ includeSubfolders: v })} />
      </SettingRow>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" disabled={!isAdmin || busy} onClick={() => run('test')}>{busy === 'test' ? 'Testing...' : 'Test connection'}</button>
        <button className="btn" disabled={!isAdmin || busy || !cfg.enabled} onClick={() => run('sync')}>{busy === 'sync' ? 'Syncing...' : 'Sync now'}</button>
        <button className="btn danger" disabled={!isAdmin || busy || !st.fileCount} onClick={() => setConfirm(true)}>Remove synced copies</button>
        {result && (result.detail !== undefined ? <span className="small"><Badge tone={result.ok ? 'green' : 'red'}>{result.ok ? 'Connected' : 'Problem'}</Badge> {result.detail}</span>
          : <span className="small"><Badge tone={result.ok ? 'green' : 'red'}>{result.ok ? 'Done' : 'Problem'}</Badge> {result.ok ? (result.note || `${result.count} file${result.count === 1 ? '' : 's'} ready.`) : result.error}</span>)}
      </div>
      {cfg.enabled && <p className="muted small" style={{ marginTop: 10 }}>{st.fileCount} file{st.fileCount === 1 ? '' : 's'} in use. Last sync: {when(last?.at)}{last && !last.ok ? <>. <strong style={{ color: 'var(--red)' }}>Failed: {last.error}</strong></> : ''}{last?.truncated ? '. Stopped at the file limit.' : ''}</p>}
      {last?.skipped?.length > 0 && (
        <details style={{ marginTop: 8 }}><summary className="small">{last.skipped.length} file{last.skipped.length === 1 ? '' : 's'} not used</summary>
          <ul className="small muted" style={{ paddingLeft: 18, marginTop: 6 }}>{last.skipped.map((x, i) => <li key={i}><strong>{x.path}</strong>: {x.reason}</li>)}</ul>
        </details>
      )}

      {pick && (
        <Modal title="Choose a folder" onClose={() => setPick(null)}>
          <p className="small" style={{ marginBottom: 8 }}><strong>{pick.path}</strong>{pick.files !== undefined && <span className="muted"> · {pick.files} file{pick.files === 1 ? '' : 's'} directly inside</span>}</p>
          {pick.error && <div className="outcome red" role="alert"><div>{pick.error}</div></div>}
          <div className="list" style={{ maxHeight: 280, overflow: 'auto' }}>
            {pick.path !== '/' && <button className="item" onClick={() => browse(pick.path.replace(/\/[^/]+$/, '') || '/')}><div className="body">.. (up one level)</div></button>}
            {(pick.folders || []).map((f) => <button key={f.path} className="item" onClick={() => browse(f.path)}><div className="body"><div className="cell-title">{f.name}</div></div></button>)}
            {!pick.loading && !pick.error && (pick.folders || []).length === 0 && <p className="muted small" style={{ padding: 8 }}>No sub-folders here.</p>}
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setPick(null)}>Cancel</button>
            <button className="btn primary" disabled={pick.loading || pick.path === '/'} onClick={() => commit(pick.path)}>Use this folder</button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title="Remove the synced copies?" onClose={() => setConfirm(false)}>
          <p>This deletes the copies of Egnyte documents stored in this app. Nothing in Egnyte is touched. They come back at the next sync if the link is still on.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn primary" style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }} onClick={async () => { setConfirm(false); await api('DELETE', '/api/egnyte/files'); await reloadFiles(); toast('Synced copies removed') }}>Remove</button>
          </div>
        </Modal>
      )}
    </Card>
  )
}
