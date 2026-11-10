// A tiny stand-in for Zoho Desk, for demos and automated tests. It speaks the same endpoints the real
// adapter uses, so the whole flow can be tried without a Zoho account. All people and text are made up.
//   node server/mock-zoho.js        (listens on MOCK_ZOHO_PORT, default 8787)
import { createServer } from 'node:http'

export function createMockZoho({ orgId = 'mock-org', seed = true } = {}) {
  const tickets = []
  const log = []
  let n = 1000
  const add = (t) => {
    const id = String(++n)
    const ticket = { id, ticketNumber: String(n), status: 'Open', departmentId: 'dept-hr', createdTime: new Date().toISOString(), comments: [], replies: [], tags: [], ...t }
    tickets.push(ticket)
    return ticket
  }
  if (seed) {
    add({ subject: 'How many PTO days do I get?', name: 'Riley Demo', email: 'riley.demo@example.com', description: '<p>Hi, I started in March. How many vacation days do I have this year?</p>' })
    add({ subject: 'Direct deposit change', name: 'Sam Sample', email: 'sam.sample@example.com', description: '<p>I changed banks. How do I update my direct deposit?</p>' })
    add({ subject: 'Concerned about my manager', name: 'Jordan Example', email: 'jordan.example@example.com', description: '<p>My manager keeps making inappropriate comments and I am afraid to report it.</p>' })
  }
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)) }
  const readBody = (req) => new Promise((resolve) => { let b = ''; req.on('data', (c) => { b += c }); req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}) } catch { resolve({}) } }) })
  const view = (t) => ({ id: t.id, ticketNumber: t.ticketNumber, subject: t.subject, email: t.email, status: t.status, departmentId: t.departmentId, createdTime: t.createdTime, webUrl: `https://desk.example.invalid/ticket/${t.id}`, contact: { firstName: t.name.split(' ')[0], lastName: t.name.split(' ').slice(1).join(' '), email: t.email } })

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    const p = url.pathname
    if (p === '/oauth/v2/token' && req.method === 'POST') return json(res, 200, { access_token: 'mock-token', expires_in: 3600 })
    if (p === '/__mock/state') return json(res, 200, { tickets, log })
    if (p === '/__mock/tickets' && req.method === 'POST') { const b = await readBody(req); return json(res, 201, add({ subject: b.subject, name: b.name || 'Test Person', email: b.email || 'test.person@example.com', description: b.description || '' })) }
    if (!p.startsWith('/api/v1/')) return json(res, 404, { message: 'not found' })
    if (req.headers.authorization !== 'Zoho-oauthtoken mock-token') return json(res, 401, { errorCode: 'INVALID_OAUTH' })
    if (req.headers.orgid !== orgId) return json(res, 403, { errorCode: 'INVALID_ORGID' })
    const rest = p.slice('/api/v1'.length).split('/').filter(Boolean)
    const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : {}
    if (rest[0] !== 'tickets') return json(res, 404, { message: 'not found' })
    if (rest.length === 1 && req.method === 'GET') {
      const want = (url.searchParams.get('status') || '').split(',').filter(Boolean)
      const dept = url.searchParams.get('departmentId')
      const limit = Number(url.searchParams.get('limit') || 50)
      const list = tickets.filter((t) => (!want.length || want.includes(t.status)) && (!dept || t.departmentId === dept)).sort((a, b) => b.createdTime.localeCompare(a.createdTime)).slice(0, limit)
      return json(res, 200, { data: list.map(view) })
    }
    const t = tickets.find((x) => x.id === rest[1])
    if (!t) return json(res, 404, { errorCode: 'URL_NOT_FOUND', message: 'Ticket not found' })
    if (rest.length === 2 && req.method === 'GET') return json(res, 200, { ...view(t), description: t.description })
    if (rest.length === 2 && ['PATCH', 'PUT'].includes(req.method)) { Object.assign(t, body.status ? { status: body.status } : {}, body.assigneeId ? { assigneeId: body.assigneeId } : {}); log.push({ ticket: t.id, op: 'update', body }); return json(res, 200, view(t)) }
    if (rest[2] === 'comments' && req.method === 'POST') { t.comments.push({ content: body.content, isPublic: body.isPublic === true }); log.push({ ticket: t.id, op: 'comment', isPublic: body.isPublic === true }); return json(res, 201, { id: String(t.comments.length) }) }
    if (rest[2] === 'sendReply' && req.method === 'POST') { t.replies.push({ to: body.to, content: body.content }); log.push({ ticket: t.id, op: 'reply', to: body.to }); return json(res, 200, { id: String(t.replies.length) }) }
    if (rest[2] === 'associateTag' && req.method === 'POST') { t.tags.push(...(body.tags || [])); log.push({ ticket: t.id, op: 'tags', tags: body.tags }); return json(res, 200, {}) }
    if (rest[2] === 'threads') return json(res, 200, { data: [] })
    return json(res, 404, { message: 'not found' })
  })
  return { server, tickets, log, add }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.MOCK_ZOHO_PORT || 8787)
  createMockZoho({ orgId: process.env.ZOHO_ORG_ID || 'mock-org' }).server.listen(port, '0.0.0.0', () => console.log(`Mock Zoho Desk listening on :${port}`))
}
