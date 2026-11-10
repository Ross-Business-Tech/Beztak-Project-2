import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import { createUser, endSession, ensureAdmin, hashPassword, makeLimiter, startSession, userForToken, validatePassword, verifyPassword } from './auth.js'
import { createService, HttpError } from './service.js'
import { openDb } from './db.js'
import { aiConfigured, makeTransport } from './ai.js'

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2', '.map': 'application/json' }
const COOKIE = 'hr_session'
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
}

export function createApp(cfg, { fetchImpl = fetch, seedSampleFiles = false, log = console.log } = {}) {
  const db = openDb(cfg.dataDir)
  ensureAdmin(db, cfg, log)
  const svc = createService(cfg, db, { fetchImpl, seedSampleFiles })
  const loginLimit = makeLimiter(8, 15 * 60_000)
  const aiTransport = makeTransport(cfg.ai, fetchImpl)
  const staticDir = normalize(cfg.staticDir)

  const routes = []
  const route = (method, pattern, role, fn, big) => routes.push({ method, role, fn, big, keys: [...pattern.matchAll(/:(\w+)/g)].map((m) => m[1]), re: new RegExp(`^${pattern.replace(/:\w+/g, '([^/]+)')}$`) })

  const readBody = (req, limit = 2_000_000) => new Promise((resolve, reject) => {
    const chunks = []; let size = 0
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'That request is too large.')); req.destroy() } else chunks.push(c) })
    req.on('end', () => { try { resolve(size ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}) } catch { reject(new HttpError(400, 'The request was not valid JSON.')) } })
    req.on('error', reject)
  })
  const cookies = (req) => Object.fromEntries(String(req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]))
  const isHttps = (req) => cfg.cookieSecure === 'true' || (cfg.cookieSecure === 'auto' && (req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted))
  const setCookie = (req, res, token, maxAge) => res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`)
  const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...SECURITY_HEADERS }); res.end(JSON.stringify(body)) }
  const fail = (res, e) => { if (!e.status) console.error(e); send(res, e.status || 500, { error: e.status ? e.message : 'Something went wrong on the server.' }) }

  // ---------- routes ----------
  route('GET', '/api/health', null, (ctx) => ({ ok: true, mode: 'server', signedIn: Boolean(ctx.user) }))

  route('POST', '/api/login', null, async (ctx) => {
    const ip = ctx.req.socket.remoteAddress || 'x'
    if (!loginLimit(ip)) throw new HttpError(429, 'Too many sign-in attempts. Wait a few minutes and try again.')
    const u = db.userByName(String(ctx.body.username || '').trim())
    const ok = u ? verifyPassword(String(ctx.body.password || ''), u.password_hash) : (verifyPassword('x', hashPassword('y')), false)
    if (!ok) throw new HttpError(401, 'That username or password is not right.')
    setCookie(ctx.req, ctx.res, startSession(db, u.id, cfg.sessionHours), cfg.sessionHours * 3600)
    svc.log('auth', `${u.username} signed in`, u.username)
    return { username: u.username, role: u.role }
  })
  route('POST', '/api/logout', null, (ctx) => { endSession(db, cookies(ctx.req)[COOKIE]); setCookie(ctx.req, ctx.res, '', 0); return { ok: true } })
  route('GET', '/api/me', 'any', (ctx) => ctx.user)

  route('GET', '/api/state', 'any', (ctx) => ({
    user: ctx.user, settings: svc.getSettings(), workflow: svc.getWorkflow(), files: svc.getFiles(),
    emails: db.listEmails(500), activity: db.listActivity(300), status: svc.status(),
  }))
  route('GET', '/api/emails', 'any', () => ({ emails: db.listEmails(500), activity: db.listActivity(300), status: svc.status() }))
  route('PUT', '/api/config/:key', 'admin', (ctx) => { svc.putConfig(ctx.params.key, ctx.body.value, ctx.user.username); return { ok: true } }, 30_000_000)

  route('POST', '/api/emails/test', 'any', (ctx) => svc.testEmail(ctx.body, ctx.user.username))
  route('DELETE', '/api/emails/tests', 'admin', () => { db.deleteTestEmails(); return { ok: true } })
  route('POST', '/api/emails/:id/resolve', 'any', (ctx) => svc.resolve(ctx.params.id, ctx.body.kind, ctx.body.text, ctx.user.username))
  route('POST', '/api/emails/:id/note', 'any', (ctx) => svc.addNote(ctx.params.id, ctx.body.text, ctx.user.username))
  route('PUT', '/api/emails/:id/draft', 'any', (ctx) => svc.saveDraft(ctx.params.id, ctx.body.text))
  route('POST', '/api/emails/:id/regenerate', 'any', (ctx) => svc.regenerate(ctx.params.id, ctx.user.username))
  route('DELETE', '/api/emails/:id', 'admin', (ctx) => { svc.deleteEmail(ctx.params.id, ctx.user.username); return { ok: true } })
  route('POST', '/api/log', 'any', (ctx) => { svc.log(String(ctx.body.type || 'system').slice(0, 20), String(ctx.body.text || '').slice(0, 500), ctx.user.username); return { ok: true } })

  route('GET', '/api/integrations/status', 'any', () => svc.status())
  route('POST', '/api/integrations/test', 'admin', () => svc.testTicketing())
  route('POST', '/api/integrations/sync', 'admin', () => svc.ingestOnce())

  // The browser's "test AI connection" button goes through here. The key never reaches the browser.
  route('POST', '/api/ai', 'any', async (ctx) => {
    const r = await aiTransport('/api/ai', { body: JSON.stringify(ctx.body), signal: AbortSignal.timeout(60_000) })
    ctx.raw = { status: r.status, body: await r.text() }
  })

  route('GET', '/api/users', 'admin', () => ({ users: db.listUsers() }))
  route('POST', '/api/users', 'admin', (ctx) => { const u = createUser(db, ctx.body); svc.log('auth', `${ctx.user.username} created the ${u.role} account "${u.username}"`, ctx.user.username); return u })
  route('DELETE', '/api/users/:id', 'admin', (ctx) => {
    const u = db.userById(ctx.params.id)
    if (!u) throw new HttpError(404, 'No such user.')
    if (u.role === 'admin' && db.adminCount() <= 1) throw new HttpError(409, 'You cannot remove the last admin.')
    db.deleteUser(u.id); svc.log('auth', `${ctx.user.username} removed the account "${u.username}"`, ctx.user.username); return { ok: true }
  })
  route('POST', '/api/password', 'any', (ctx) => {
    const u = db.userById(ctx.user.id)
    if (!verifyPassword(String(ctx.body.current || ''), u.password_hash)) throw new HttpError(401, 'The current password is not right.')
    const bad = validatePassword(ctx.body.next)
    if (bad) throw new HttpError(400, bad)
    db.setPassword(u.id, hashPassword(ctx.body.next))
    setCookie(ctx.req, ctx.res, startSession(db, u.id, cfg.sessionHours), cfg.sessionHours * 3600)
    svc.log('auth', `${u.username} changed their password`, u.username)
    return { ok: true }
  })

  // ---------- static app ----------
  function serveStatic(req, res, pathname) {
    let file = normalize(join(staticDir, decodeURIComponent(pathname)))
    if (file !== staticDir && !file.startsWith(staticDir + sep)) { res.writeHead(403); return res.end() }
    if (!existsSync(file) || !statSync(file).isFile()) file = join(staticDir, 'index.html')
    if (!existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('The app files are missing. Run "npm run build" first.') }
    const type = MIME[extname(file)] || 'application/octet-stream'
    const immutable = file.includes(`${sep}assets${sep}`)
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache', ...SECURITY_HEADERS })
    res.end(req.method === 'HEAD' ? undefined : readFileSync(file))
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      if (!url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end() }
        return serveStatic(req, res, url.pathname)
      }
      const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname))
      if (!r) throw new HttpError(404, 'Not found.')
      const m = url.pathname.match(r.re)
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]))
      const user = userForToken(db, cookies(req)[COOKIE])
      if (r.role && !user) throw new HttpError(401, 'Please sign in.')
      if (r.role === 'admin' && user.role !== 'admin') throw new HttpError(403, 'Only an admin can do that.')
      if (req.method !== 'GET' && req.headers['x-hr-csrf'] !== '1') throw new HttpError(403, 'Blocked: missing request header.')
      const body = req.method === 'GET' || req.method === 'DELETE' ? {} : await readBody(req, r.big || 2_000_000)
      const ctx = { req, res, params, user, body, raw: null }
      const out = await r.fn(ctx)
      if (ctx.raw) { res.writeHead(ctx.raw.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(ctx.raw.body) }
      send(res, 200, out ?? { ok: true })
    } catch (e) { if (!res.headersSent) fail(res, e); else res.end() }
  })

  return { server, db, svc, close() { svc.stop(); server.close(); db.close() } }
}
