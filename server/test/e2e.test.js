// End-to-end test: real server code + a stand-in Zoho Desk + a stand-in AI provider. Run with `npm run test:server`.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createMockZoho } from '../mock-zoho.js'
import { loadConfig } from '../config.js'
import { createApp } from '../app.js'

const listen = (server) => new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)))

// A fake AI provider: answers the two kinds of request the workflow makes.
function fakeAI() {
  const calls = []
  const server = createServer((req, res) => {
    let b = ''; req.on('data', (c) => { b += c }); req.on('end', () => {
      const body = JSON.parse(b); calls.push({ auth: req.headers.authorization, model: body.model })
      const sys = body.messages[0].content
      const reply = sys.includes('triage assistant')
        ? { category: 'time_off', flags: [], certainty: 90 }
        : { draft: 'Hi there,\n\nHere is what I found about your request.', sources: [], confidence: 85 }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) } }] }))
    })
  })
  return { server, calls }
}

async function setup(extra = {}) {
  const zoho = createMockZoho({ orgId: 'org1' }); const zPort = await listen(zoho.server)
  const ai = fakeAI(); const aPort = await listen(ai.server)
  const cfg = loadConfig({
    DATA_DIR: ':memory:', ADMIN_PASSWORD: 'correct-horse-battery', TICKETING_ADAPTER: 'zohodesk', BACKFILL_DAYS: '1',
    ZOHO_DESK_URL: `http://127.0.0.1:${zPort}`, ZOHO_ACCOUNTS_URL: `http://127.0.0.1:${zPort}`, ZOHO_ORG_ID: 'org1',
    ZOHO_CLIENT_ID: 'c', ZOHO_CLIENT_SECRET: 's', ZOHO_REFRESH_TOKEN: 'r', ZOHO_ASSIGNEES: '{"HR Director":"agent-9"}',
    AI_BASE_URL: `http://127.0.0.1:${aPort}/v1`, AI_API_KEY: 'test-key', ...extra,
  })
  const app = createApp(cfg, { log: () => {} }); const port = await listen(app.server)
  const base = `http://127.0.0.1:${port}`
  let cookie = ''
  const api = async (method, path, body, opts = {}) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(opts.csrf === false ? {} : { 'x-hr-csrf': '1' }), ...(opts.noCookie ? {} : { cookie }) }, body: body === undefined ? undefined : JSON.stringify(body) })
    const sc = res.headers.get('set-cookie'); if (sc && !opts.noCookie && path === '/api/login') cookie = sc.split(';')[0]
    return { status: res.status, json: await res.json().catch(() => null) }
  }
  const stop = () => { app.close(); zoho.server.close(); ai.server.close() }
  return { app, zoho, ai, api, stop, base }
}

test('security basics: sign-in required, CSRF header required, roles enforced', async () => {
  const t = await setup()
  try {
    assert.equal((await t.api('GET', '/api/state', undefined, { noCookie: true })).status, 401)
    assert.equal((await t.api('POST', '/api/login', { username: 'admin', password: 'nope-nope-nope' })).status, 401)
    assert.equal((await t.api('POST', '/api/login', { username: 'admin', password: 'correct-horse-battery' }, { csrf: false })).status, 403)
    assert.equal((await t.api('POST', '/api/login', { username: 'admin', password: 'correct-horse-battery' })).status, 200)
    assert.equal((await t.api('GET', '/api/users')).status, 200)
  } finally { t.stop() }
})

test('tickets flow in, are processed safely, written back, and approved', async () => {
  const t = await setup()
  try {
    assert.equal((await t.api('POST', '/api/login', { username: 'admin', password: 'correct-horse-battery' })).status, 200)
    assert.equal((await t.api('PUT', '/api/emails/x/draft', { text: 'x' }, { csrf: false })).status, 403, 'mutations need the CSRF header')

    // team accounts and roles
    assert.equal((await t.api('POST', '/api/users', { username: 'rev1', password: 'a-long-password-1', role: 'reviewer' })).status, 200)
    assert.equal((await t.api('POST', '/api/users', { username: 'rev2', password: 'short', role: 'reviewer' })).status, 400)

    // nothing is pulled until the admin switches it on
    let r = await t.api('POST', '/api/integrations/sync')
    assert.match(r.json.skipped, /switched off/)
    const st = (await t.api('GET', '/api/state')).json
    await t.api('PUT', '/api/config/settings', { value: { ...st.settings, integrations: { zoho: { ...st.settings.integrations.zoho, enabled: true } } } })

    assert.equal((await t.api('POST', '/api/integrations/test')).json.ok, true)
    r = await t.api('POST', '/api/integrations/sync')
    assert.equal(r.json.ok, true); assert.equal(r.json.count, 3)

    const emails = (await t.api('GET', '/api/emails')).json.emails
    assert.equal(emails.length, 3)
    const risky = emails.find((e) => /manager/i.test(e.subject))
    assert.ok(risky.result.flags.some((f) => f.name === 'Harassment'), 'harassment flagged')
    assert.ok(risky.result.careful, 'careful reply for high-risk message')
    assert.ok(emails.every((e) => ['pending_review', 'escalated'].includes(e.status)), 'nothing is sent automatically')
    assert.ok(t.ai.calls.length > 0 && t.ai.calls.every((c) => c.auth === 'Bearer test-key'), 'AI called from the server with the server key')

    // written back to Zoho: private notes only, status/tags applied, nothing emailed
    const zt = t.zoho.tickets
    assert.ok(zt.every((x) => x.replies.length === 0), 'no reply emailed to anyone')
    assert.ok(zt.every((x) => x.comments.length >= 1 && x.comments.every((c) => c.isPublic === false)), 'draft saved as private note')
    const zr = zt.find((x) => x.id === risky.ticketId)
    assert.equal(zr.status, 'Escalated'); assert.ok(zr.tags.includes('Harassment'))

    // dedupe
    const reads = t.zoho.stats.detailReads
    assert.equal((await t.api('POST', '/api/integrations/sync')).json.count, 0)
    assert.equal(t.zoho.stats.detailReads, reads, 'known tickets are not read again')

    // reviewer approves with default mode (private note)
    await t.api('POST', '/api/login', { username: 'rev1', password: 'a-long-password-1' })
    assert.equal((await t.api('PUT', '/api/config/settings', { value: {} })).status, 403, 'reviewers cannot change settings')
    const pto = emails.find((e) => /PTO/.test(e.subject))
    const before = t.zoho.tickets.find((x) => x.id === pto.ticketId).comments.length
    r = await t.api('POST', `/api/emails/${pto.id}/resolve`, { kind: 'send', text: 'Edited reply text' })
    assert.equal(r.status, 200); assert.equal(r.json.status, 'approved_sent'); assert.equal(r.json.wasEdited, true)
    const after = t.zoho.tickets.find((x) => x.id === pto.ticketId)
    assert.equal(after.comments.length, before + 1); assert.equal(after.replies.length, 0)
    assert.equal((await t.api('POST', `/api/emails/${pto.id}/resolve`, { kind: 'send', text: 'again' })).status, 409, 'cannot approve twice')
    assert.equal((await t.api('DELETE', `/api/emails/${pto.id}`)).status, 403)

    // admin switches to real replies; then a Zoho outage must NOT mark the message as sent
    await t.api('POST', '/api/login', { username: 'admin', password: 'correct-horse-battery' })
    const s2 = (await t.api('GET', '/api/state')).json.settings
    await t.api('PUT', '/api/config/settings', { value: { ...s2, integrations: { zoho: { ...s2.integrations.zoho, onApprove: 'send_reply' } } } })
    const dd = emails.find((e) => /deposit/i.test(e.subject))
    r = await t.api('POST', `/api/emails/${dd.id}/resolve`, { kind: 'send', text: 'Here is how to update it.' })
    assert.equal(r.status, 200)
    assert.equal(t.zoho.tickets.find((x) => x.id === dd.ticketId).replies[0].to, 'sam.sample@example.com')
    t.zoho.server.close(); t.zoho.server.closeAllConnections?.()
    r = await t.api('POST', `/api/emails/${risky.id}/resolve`, { kind: 'send', text: 'careful reply' })
    assert.equal(r.status, 502)
    assert.equal(t.app.db.getEmail(risky.id).status, risky.status, 'unchanged after failure')
  } finally { t.stop() }
})

test('test emails never touch Zoho, and auto-send is off by default', async () => {
  const t = await setup()
  try {
    await t.api('POST', '/api/login', { username: 'admin', password: 'correct-horse-battery' })
    const r = await t.api('POST', '/api/emails/test', { name: 'Test Person', from: 'tp@example.com', subject: 'Holiday schedule', body: 'What days are we closed for holidays?' })
    assert.equal(r.status, 200); assert.equal(r.json.source, 'test')
    assert.equal(t.zoho.log.length, 0, 'no calls to Zoho for test emails')
  } finally { t.stop() }
})

test('behind a proxy, one person guessing passwords does not lock everyone else out', async () => {
  const t = await setup({ TRUST_PROXY: 'true' })
  try {
    const login = (ip, password) => fetch(`${t.base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hr-csrf': '1', 'x-forwarded-for': `1.1.1.1, ${ip}` }, body: JSON.stringify({ username: 'admin', password }) }).then((r) => r.status)
    for (let i = 0; i < 8; i++) assert.equal(await login('9.9.9.9', 'wrong-wrong-wrong'), 401)
    assert.equal(await login('9.9.9.9', 'correct-horse-battery'), 429, 'the guesser is blocked')
    assert.equal(await login('8.8.8.8', 'correct-horse-battery'), 200, 'a different visitor is not')
  } finally { t.stop() }
})
