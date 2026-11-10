// Settings cards that only exist when the app runs against the self-hosted server.
import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { api } from '../serverApi'
import { Badge, Card, Field, SettingRow, Toggle } from './ui'

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
      <SettingRow title="Server connection" hint={t.adapter === 'none' ? 'No ticketing system is configured on this server. Set TICKETING_ADAPTER=zohodesk and the ZOHO_ variables (see docs/zoho-desk.md).' : t.configured ? 'Zoho Desk credentials are present on the server.' : `Missing on the server: ${t.missing.join(', ')}.`}>
        {t.adapter === 'none' ? <Badge tone="amber">Not configured</Badge> : t.configured ? <Badge tone="green">Configured</Badge> : <Badge tone="red">Incomplete</Badge>}
      </SettingRow>
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
