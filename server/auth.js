import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { nowIso, uid } from './util.js'

export const ROLES = ['admin', 'reviewer']
const hashToken = (t) => createHash('sha256').update(t).digest('hex')

export function hashPassword(pw) {
  const salt = randomBytes(16)
  return `scrypt$${salt.toString('hex')}$${scryptSync(pw, salt, 64).toString('hex')}`
}
export function verifyPassword(pw, stored) {
  const [kind, saltHex, hashHex] = String(stored).split('$')
  if (kind !== 'scrypt' || !saltHex || !hashHex) return false
  const want = Buffer.from(hashHex, 'hex')
  const got = scryptSync(pw, Buffer.from(saltHex, 'hex'), want.length)
  return got.length === want.length && timingSafeEqual(got, want)
}

export function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Use a password of at least 10 characters.'
  if (pw.length > 200) return 'That password is too long.'
  return null
}

export function createUser(db, { username, password, role }) {
  const name = String(username || '').trim()
  if (!/^[A-Za-z0-9._@-]{2,64}$/.test(name)) throw Object.assign(new Error('Usernames use letters, numbers and . _ @ - (2 to 64 characters).'), { status: 400 })
  if (!ROLES.includes(role)) throw Object.assign(new Error('Role must be admin or reviewer.'), { status: 400 })
  const bad = validatePassword(password)
  if (bad) throw Object.assign(new Error(bad), { status: 400 })
  if (db.userByName(name)) throw Object.assign(new Error('That username is already taken.'), { status: 409 })
  const u = { id: uid('u'), username: name, passwordHash: hashPassword(password), role, createdAt: nowIso() }
  db.putUser(u)
  return { id: u.id, username: u.username, role: u.role }
}

/** First start: make the first admin from ADMIN_PASSWORD, or print a one-time password to the server log. */
export function ensureAdmin(db, cfg, log = console.log) {
  if (db.userCount() > 0) return
  const generated = !cfg.admin.password
  const password = cfg.admin.password || randomBytes(12).toString('base64url')
  createUser(db, { username: cfg.admin.username, password, role: 'admin' })
  if (generated) log(`\n  First start: created the admin account.\n    username: ${cfg.admin.username}\n    password: ${password}\n  Sign in and change it under Settings > Team. This is shown only once.\n`)
  else log(`First start: created the admin account "${cfg.admin.username}" from ADMIN_PASSWORD.`)
}

export function startSession(db, userId, hours) {
  const token = randomBytes(32).toString('base64url')
  db.putSession(hashToken(token), userId, Date.now() + hours * 3600_000)
  return token
}
export const endSession = (db, token) => token && db.deleteSession(hashToken(token))
export function userForToken(db, token) {
  if (!token) return null
  const s = db.getSession(hashToken(token))
  if (!s || s.expires_at < Date.now()) return null
  const u = db.userById(s.user_id)
  return u ? { id: u.id, username: u.username, role: u.role } : null
}

/** Allow at most `max` attempts per `windowMs` per key (simple brute-force guard). */
export function makeLimiter(max, windowMs) {
  const hits = new Map()
  return (key) => {
    const now = Date.now()
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs)
    if (list.length >= max) { hits.set(key, list); return false }
    list.push(now); hits.set(key, list)
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
    return true
  }
}
