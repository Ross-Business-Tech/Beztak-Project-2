// One SQLite file holds everything (settings, workflow, knowledge files, emails, users, activity).
// Uses the SQLite built into Node 22+, so there is nothing extra to install. Back up by copying the file.
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export function openDb(dir) {
  if (dir !== ':memory:') mkdirSync(dir, { recursive: true })
  const db = new DatabaseSync(dir === ':memory:' ? ':memory:' : join(dir, 'hr-helpdesk.db'))
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY, ticket_id TEXT UNIQUE, source TEXT, status TEXT, received_at TEXT, data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS emails_received ON emails (received_at DESC);
    CREATE TABLE IF NOT EXISTS activity (id TEXT PRIMARY KEY, at TEXT NOT NULL, type TEXT, actor TEXT, text TEXT);
    CREATE INDEX IF NOT EXISTS activity_at ON activity (at DESC);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
  `)

  const q = (sql) => db.prepare(sql)
  const s = {
    kvGet: q('SELECT value FROM kv WHERE key = ?'), kvSet: q('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
    emailAll: q('SELECT data FROM emails ORDER BY received_at DESC LIMIT ?'), emailOne: q('SELECT data FROM emails WHERE id = ?'),
    emailByTicket: q('SELECT id FROM emails WHERE ticket_id = ?'),
    emailPut: q('INSERT INTO emails (id, ticket_id, source, status, received_at, data) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data'),
    emailDel: q('DELETE FROM emails WHERE id = ?'), emailDelTests: q("DELETE FROM emails WHERE source = 'test'"),
    actPut: q('INSERT INTO activity (id, at, type, actor, text) VALUES (?, ?, ?, ?, ?)'), actAll: q('SELECT id, at, type, actor, text FROM activity ORDER BY at DESC LIMIT ?'),
    userCount: q('SELECT COUNT(*) AS n FROM users'), userByName: q('SELECT * FROM users WHERE username = ? COLLATE NOCASE'),
    userById: q('SELECT * FROM users WHERE id = ?'), userAll: q('SELECT id, username, role, created_at FROM users ORDER BY username'),
    userPut: q('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)'),
    userSetPw: q('UPDATE users SET password_hash = ? WHERE id = ?'), userDel: q('DELETE FROM users WHERE id = ?'),
    adminCount: q("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'"),
    sessPut: q('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'), sessGet: q('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?'),
    sessDel: q('DELETE FROM sessions WHERE token_hash = ?'), sessPurge: q('DELETE FROM sessions WHERE expires_at < ?'), sessDelUser: q('DELETE FROM sessions WHERE user_id = ?'),
  }
  const parse = (r) => (r ? JSON.parse(r.data) : null)
  return {
    raw: db, close: () => db.close(),
    kvGet: (key, fallback = null) => { const r = s.kvGet.get(key); return r ? JSON.parse(r.value) : fallback },
    kvSet: (key, value) => { s.kvSet.run(key, JSON.stringify(value)) },
    listEmails: (limit = 500) => s.emailAll.all(limit).map(parse),
    getEmail: (id) => parse(s.emailOne.get(id)),
    emailIdForTicket: (ticketId) => s.emailByTicket.get(String(ticketId))?.id || null,
    putEmail: (e) => { s.emailPut.run(e.id, e.ticketId ? String(e.ticketId) : null, e.source || '', e.status || '', e.receivedAt, JSON.stringify(e)) },
    deleteEmail: (id) => { s.emailDel.run(id) }, deleteTestEmails: () => { s.emailDelTests.run() },
    addActivity: (a) => { s.actPut.run(a.id, a.at, a.type, a.actor || '', a.text) },
    listActivity: (limit = 300) => s.actAll.all(limit).map((r) => ({ ...r })),
    userCount: () => s.userCount.get().n, adminCount: () => s.adminCount.get().n,
    userByName: (n) => s.userByName.get(n), userById: (id) => s.userById.get(id), listUsers: () => s.userAll.all().map((r) => ({ ...r })),
    putUser: (u) => { s.userPut.run(u.id, u.username, u.passwordHash, u.role, u.createdAt) },
    setPassword: (id, hash) => { s.userSetPw.run(hash, id); s.sessDelUser.run(id) },
    deleteUser: (id) => { s.userDel.run(id) },
    putSession: (hash, userId, exp) => { s.sessPut.run(hash, userId, exp) }, getSession: (hash) => s.sessGet.get(hash),
    deleteSession: (hash) => { s.sessDel.run(hash) }, purgeSessions: () => { s.sessPurge.run(Date.now()) },
  }
}
