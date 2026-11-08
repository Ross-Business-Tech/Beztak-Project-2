import { useEffect, useState } from 'react'
import { useApp } from './store'
import { Toasts } from './components/ui'
import Lab from './pages/Lab'
import Review from './pages/Review'
import Dashboard from './pages/Dashboard'
import Files from './pages/Files'
import FlagRules from './pages/FlagRules'
import Settings from './pages/Settings'
import Activity from './pages/Activity'
import Guide from './pages/Guide'
import { Icon } from './components/ui'

function useHashRoute() {
  const get = () => window.location.hash.replace(/^#/, '') || '/help'
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const h = () => { setRoute(get()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  return route
}

const NAV = [
  { group: 'Guide' },
  { to: '/help', icon: 'book', label: 'Getting started', match: (r) => r === '/help' },
  { group: 'Test Lab' },
  { to: '/lab', icon: 'mail', label: 'Test emails', match: (r) => r === '/lab' },
  { to: '/lab/docs', icon: 'file', label: 'Test documents', match: (r) => r === '/lab/docs' },
  { group: 'Administration' },
  { to: '/admin', icon: 'chart', label: 'Dashboard', match: (r) => r === '/admin' },
  { to: '/admin/review', icon: 'inbox', label: 'Review queue', badge: true, match: (r) => r === '/admin/review' },
  { to: '/admin/files', icon: 'folder', label: 'Knowledge files', match: (r) => r === '/admin/files' },
  { to: '/admin/flags', icon: 'flag', label: 'Flag rules', match: (r) => r === '/admin/flags' },
  { to: '/admin/settings', icon: 'gear', label: 'Settings', match: (r) => r === '/admin/settings' },
  { to: '/admin/activity', icon: 'log', label: 'Activity log', match: (r) => r === '/admin/activity' },
]

function Page({ route }) {
  if (route.startsWith('/lab')) return <Lab route={route} />
  if (route === '/help') return <Guide />
  switch (route) {
    case '/admin': return <Dashboard />
    case '/admin/review': return <Review />
    case '/admin/files': return <Files />
    case '/admin/flags': return <FlagRules />
    case '/admin/settings': return <Settings />
    case '/admin/activity': return <Activity />
    default: return <Guide />
  }
}

export default function App() {
  const route = useHashRoute()
  const { emails, toasts } = useApp()
  const [open, setOpen] = useState(false)
  const waiting = emails.filter((e) => e.status === 'pending_review' || e.status === 'escalated').length
  useEffect(() => setOpen(false), [route])

  return (
    <div className="shell">
      <div className="topbar"><button onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" size={22} /></button> HR Help Desk AI</div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark" aria-hidden>HR</div>HR Help Desk AI</div>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => n.group ? <div key={n.group} className="nav-group">{n.group}</div> : (
            <a key={n.to} href={`#${n.to}`} className={n.match(route) ? 'active' : ''} aria-current={n.match(route) ? 'page' : undefined}>
              <Icon name={n.icon} />{n.label}{n.badge && waiting > 0 && <span className="count">{waiting}</span>}
            </a>
          ))}
        </nav>
        <div className="side-note">Test environment. Simulated AI.</div>
      </aside>
      <main className="main">
        <div className="sim-banner" role="note"><strong>Test environment.</strong> The AI is simulated and no real email is read or sent.</div>
        <Page route={route} />
      </main>
      <Toasts toasts={toasts} />
    </div>
  )
}
