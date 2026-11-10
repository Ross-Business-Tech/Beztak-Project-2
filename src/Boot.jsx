// Decides how the app starts: against the self-hosted server (sign in first) or as the in-browser demo.
import { useEffect, useState } from 'react'
import App from './App.jsx'
import { AppProvider } from './store.jsx'
import { ServerProvider } from './serverStore.jsx'
import Login from './pages/Login.jsx'
import { api, detectServer } from './serverApi'

export default function Boot() {
  const [phase, setPhase] = useState('loading') // loading | demo | login | app | error
  const [initial, setInitial] = useState(null)

  const load = async () => {
    try { setInitial(await api('GET', '/api/state')); setPhase('app') } catch (e) { setPhase(e.status === 401 ? 'login' : 'error') }
  }
  useEffect(() => {
    detectServer().then((h) => { if (!h) setPhase('demo'); else load() })
    const out = () => { setInitial(null); setPhase('login') }
    window.addEventListener('hr-signed-out', out)
    return () => window.removeEventListener('hr-signed-out', out)
  }, [])

  if (phase === 'loading') return <div className="login-wrap"><p className="muted">Loading...</p></div>
  if (phase === 'error') return <div className="login-wrap"><div className="card"><h1>The server is not answering</h1><p className="muted">Check that it is running, then reload this page.</p><button className="btn primary" onClick={() => location.reload()}>Reload</button></div></div>
  if (phase === 'login') return <Login onDone={load} />
  if (phase === 'app') return <ServerProvider key={initial.user.id} initial={initial}><App /></ServerProvider>
  return <AppProvider><App /></AppProvider>
}
