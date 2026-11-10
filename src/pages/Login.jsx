import { useState } from 'react'
import { api } from '../serverApi'

export default function Login({ onDone }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    try { await api('POST', '/api/login', { username, password }); await onDone() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <div className="brand" style={{ marginBottom: 16 }}><div className="brand-mark" aria-hidden>HR</div>HR Help Desk AI</div>
        <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Sign in</h1>
        <p className="muted small" style={{ marginBottom: 16 }}>Use the account your administrator gave you.</p>
        <div className="field"><label htmlFor="u">Username</label><input id="u" type="text" autoComplete="username" autoFocus required value={username} onChange={(e) => setUsername(e.target.value)} /></div>
        <div className="field"><label htmlFor="p">Password</label><input id="p" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <div className="outcome red" role="alert" style={{ marginBottom: 12 }}><div>{error}</div></div>}
        <button className="btn primary" type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  )
}
