// Zoho Desk connection. Everything here talks to the documented Zoho Desk REST API (v1).
// Credentials come from environment variables. Verify field names against your own portal with the
// "Test connection" button before going live (see docs/zoho-desk.md).
import { htmlToText } from '../util.js'

export function createZohoDeskAdapter({ zoho, ticketing }, fetchImpl = fetch) {
  const missing = ['orgId', 'clientId', 'clientSecret', 'refreshToken'].filter((k) => !zoho[k])
  let token = null
  let expiresAt = 0

  async function accessToken(force = false) {
    if (!force && token && Date.now() < expiresAt - 60_000) return token
    const url = new URL(`${zoho.accountsUrl}/oauth/v2/token`)
    url.search = new URLSearchParams({ refresh_token: zoho.refreshToken, client_id: zoho.clientId, client_secret: zoho.clientSecret, grant_type: 'refresh_token' })
    const res = await fetchImpl(url, { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.access_token) throw new Error(`Zoho sign-in failed (${j.error || res.status}). Check the client id, secret, refresh token and region.`)
    token = j.access_token
    expiresAt = Date.now() + (Number(j.expires_in) || 3600) * 1000
    return token
  }

  async function call(method, path, { query, body } = {}, retried = false) {
    const url = new URL(`${zoho.deskUrl}/api/v1${path}`)
    for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== '') url.searchParams.set(k, v)
    const res = await fetchImpl(url, {
      method,
      headers: { Authorization: `Zoho-oauthtoken ${await accessToken()}`, orgId: zoho.orgId, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401 && !retried) { await accessToken(true); return call(method, path, { query, body }, true) }
    if (res.status === 204) return null
    const text = await res.text()
    let json = null
    try { json = text ? JSON.parse(text) : null } catch { /* not JSON */ }
    if (!res.ok) {
      const why = json?.message || json?.errorCode || text.slice(0, 160) || 'no details'
      const e = new Error(`Zoho Desk ${method} ${path} failed (${res.status}): ${why}`)
      e.status = res.status
      throw e
    }
    return json
  }

  const person = (t) => {
    const c = t.contact || {}
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim()
    const from = String(t.email || c.email || '').trim()
    return { from, name: name || from.split('@')[0] || 'Employee' }
  }

  return {
    name: 'zohodesk',
    configured: missing.length === 0,
    missing: missing.map((k) => ({ orgId: 'ZOHO_ORG_ID', clientId: 'ZOHO_CLIENT_ID', clientSecret: 'ZOHO_CLIENT_SECRET', refreshToken: 'ZOHO_REFRESH_TOKEN' }[k])),

    async health() {
      const r = await call('GET', '/tickets', { query: { limit: 1, departmentId: ticketing.departmentId } })
      return { ok: true, detail: `Connected to Zoho Desk (${zoho.deskUrl}). ${Array.isArray(r?.data) ? 'Tickets are readable.' : ''}`.trim() }
    },

    /** Tickets created at or after `since` (ISO string), oldest first. */
    async listNewTickets({ since }) {
      const sinceMs = new Date(since).getTime()
      const r = await call('GET', '/tickets', { query: { status: ticketing.intakeStatuses, departmentId: ticketing.departmentId, sortBy: '-createdTime', limit: 100, from: 0, include: 'contacts' } })
      const rows = (r?.data || []).filter((t) => new Date(t.createdTime).getTime() >= sinceMs)
      const out = []
      for (const t of rows) {
        let body = ''
        try {
          const full = await call('GET', `/tickets/${t.id}`)
          body = htmlToText(full?.description || '')
          if (!body) {
            const th = await call('GET', `/tickets/${t.id}/threads`, { query: { limit: 5, from: 0 } })
            const first = (th?.data || []).filter((x) => String(x.direction || '').toLowerCase() === 'in').pop() || th?.data?.[0]
            if (first?.id) body = htmlToText((await call('GET', `/tickets/${t.id}/threads/${first.id}`))?.content || first.summary || '')
          }
        } catch (e) { body = body || '' ; if (!body) body = `(The message text could not be read from Zoho Desk: ${e.message})` }
        const p = person(t)
        out.push({ id: String(t.id), number: t.ticketNumber || '', subject: t.subject || '(no subject)', from: p.from, name: p.name, body, receivedAt: new Date(t.createdTime).toISOString(), url: t.webUrl || '', attachments: [] })
      }
      return out.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
    },

    /** Private note, visible to staff only. Safe default for AI drafts. */
    addInternalNote: (id, text) => call('POST', `/tickets/${id}/comments`, { body: { content: text, contentType: 'plainText', isPublic: false } }),
    /** Email reply to the employee. Only used when the admin chooses "send reply". */
    sendReply: (id, { to, text }) => call('POST', `/tickets/${id}/sendReply`, { body: { channel: 'EMAIL', to, contentType: 'plainText', content: text, isForward: false } }),
    setStatus: (id, status) => call('PATCH', `/tickets/${id}`, { body: { status } }),
    addTags: (id, tags) => call('POST', `/tickets/${id}/associateTag`, { body: { tags } }),
    async assign(id, assignee) {
      const agentId = zoho.assignees[assignee]
      if (!agentId) throw new Error(`No Zoho agent is mapped to "${assignee}". Add it to ZOHO_ASSIGNEES.`)
      return call('PATCH', `/tickets/${id}`, { body: { assigneeId: agentId } })
    },
  }
}
