import { useEffect, useState } from 'react'
import { useApp } from './store'
import { Toasts } from './components/ui'
import Lab from './pages/Lab'
import Review from './pages/Review'
import Dashboard from './pages/Dashboard'
import Files from './pages/Files'
import Workflow from './pages/Workflow'
import Settings from './pages/Settings'
import Activity from './pages/Activity'
import Guide from './pages/Guide'
import Import from './pages/Import'
import Access, { accessOf } from './pages/Access'
import { Icon, Segmented } from './components/ui'

function useHashRoute(home) {
  const get = () => window.location.hash.replace(/^#/, '') || home
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const h = () => { setRoute(get()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  return route
}

// Grouped by what people do: Work (every day), Manage (set-up, admins), Help, Test (trying things safely), Settings
const NAV = [
  { group: 'Help' },
  { to: '/help', icon: 'book', label: 'Getting started', match: (r) => r === '/help' },
  { group: 'Work' },
  { to: '/admin/review', icon: 'inbox', label: 'Review queue', badge: true, match: (r) => r === '/admin/review' },
  { group: 'Manage' },
  { to: '/admin', icon: 'chart', label: 'Dashboard', key: 'dashboard', match: (r) => r === '/admin' },
  { to: '/admin/workflow', icon: 'workflow', label: 'Workflow', key: 'workflow', match: (r) => r === '/admin/workflow' || r === '/admin/flags' },
  { to: '/admin/files', icon: 'folder', label: 'Knowledge files', key: 'files', match: (r) => r === '/admin/files' },
  { group: 'Test' },
  { to: '/lab', icon: 'mail', label: 'Test emails', key: 'lab', match: (r) => r === '/lab' },
  { to: '/lab/docs', icon: 'file', label: 'Test a document', key: 'labDocs', match: (r) => r === '/lab/docs' },
  { to: '/admin/import', icon: 'upload', label: 'Import and evaluate', key: 'import', match: (r) => r === '/admin/import' },
  { group: 'Settings' },
  { to: '/admin/access', icon: 'lock', label: 'Access', admin: true, match: (r) => r === '/admin/access' },
  { to: '/admin/settings', icon: 'gear', label: 'Settings', admin: true, match: (r) => r === '/admin/settings' },
  { to: '/admin/activity', icon: 'log', label: 'Activity log', key: 'activity', match: (r) => r === '/admin/activity' },
]

// Hide pages a reviewer cannot open, and any group heading left with nothing under it.
function visibleNav(isAdmin, access) {
  const items = NAV.filter((n) => n.group || (n.admin ? isAdmin : canOpen(n.to, isAdmin, access)))
  return items.filter((n, i) => !n.group || (items[i + 1] && !items[i + 1].group))
}

function AdminOnly() {
  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 20, marginTop: 0 }}>Admins only</h1>
      <p className="muted">Your admin has not opened this page to reviewers. You can work through the review queue and use the pages in your menu.</p>
      <a className="btn primary" href="#/admin/review">Go to the review queue</a>
    </div>
  )
}

// Which access key each route needs. Routes not listed are open to everyone.
const ROUTE_KEY = {
  '/admin': 'dashboard', '/admin/import': 'import', '/admin/workflow': 'workflow', '/admin/flags': 'workflow',
  '/admin/files': 'files', '/admin/activity': 'activity', '/lab': 'lab', '/lab/docs': 'labDocs',
  '/admin/settings': 'admin', '/admin/access': 'admin',
}
const VIEW_ONLY = ['workflow', 'files']

// Admins see everything; reviewers see what the admin opened on the Access page.
export function canOpen(route, isAdmin, access) {
  if (isAdmin) return true
  const key = ROUTE_KEY[route] ?? (route.startsWith('/lab') ? 'lab' : null)
  return !key || (key !== 'admin' && !!access[key])
}

function Page({ route, isAdmin, access }) {
  if (!canOpen(route, isAdmin, access)) return <AdminOnly />
  const viewOnly = !isAdmin && VIEW_ONLY.includes(ROUTE_KEY[route])
  return <>{viewOnly && <div className="sim-banner" role="note"><strong>View only.</strong> Only an admin can change this page.</div>}<PageBody route={route} /></>
}

function PageBody({ route }) {
  if (route.startsWith('/lab')) return <Lab route={route} />
  if (route === '/help') return <Guide />
  switch (route) {
    case '/admin': return <Dashboard />
    case '/admin/review': return <Review />
    case '/admin/import': return <Import />
    case '/admin/files': return <Files />
    case '/admin/flags':
    case '/admin/workflow': return <Workflow />
    case '/admin/settings': return <Settings />
    case '/admin/access': return <Access />
    case '/admin/activity': return <Activity />
    default: return <Guide />
  }
}

function StatusBanner({ status }) {
  const t = status?.ticketing
  if (t?.enabled && t.lastSync && !t.lastSync.ok) return <div className="sim-banner" role="alert"><strong>Zoho Desk problem.</strong> The last check for new tickets failed: {t.lastSync.error} <a href="#/admin/settings">Open Settings</a></div>
  const eg = status?.egnyte
  if (eg?.enabled && eg.lastSync && !eg.lastSync.ok) return <div className="sim-banner" role="alert"><strong>Egnyte problem.</strong> The last sync failed, so the AI is using the documents it copied earlier: {eg.lastSync.error} <a href="#/admin/settings">Open Settings</a></div>
  if (!status?.ai?.configured) return <div className="sim-banner" role="note"><strong>No AI provider is set on this server.</strong> Replies use the simple built-in writer until an administrator adds one (see the install guide).</div>
  return null
}

export default function App() {
  const { emails, toasts, dismissToast, serverMode, user, signOut, status, isAdmin, demoRole, setDemoRole, settings } = useApp()
  const access = accessOf(settings)
  // Reviewers open on the queue, admins on the dashboard, and visitors to the demo on the guide
  const route = useHashRoute(serverMode ? (isAdmin ? '/admin' : '/admin/review') : '/help')
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
          {visibleNav(isAdmin, access).map((n) => n.group ? <div key={n.group} className="nav-group">{n.group}</div> : (
            <a key={n.to} href={`#${n.to}`} className={n.match(route) ? 'active' : ''} aria-current={n.match(route) ? 'page' : undefined}>
              <Icon name={n.icon} />{n.label}{n.badge && waiting > 0 && <span className="count">{waiting}</span>}
            </a>
          ))}
        </nav>
        {serverMode
          ? <div className="side-note">Signed in as <strong>{user.username}</strong> ({user.role}).<br /><button className="btn small" style={{ marginTop: 8 }} onClick={signOut}>Sign out</button></div>
          : <div className="side-note role-switch">
              <div style={{ marginBottom: 6 }}>Test environment. Viewing as:</div>
              <Segmented label="View as" value={demoRole} onChange={setDemoRole} options={[{ value: 'admin', label: 'Admin' }, { value: 'reviewer', label: 'Reviewer' }]} />
              <div style={{ marginTop: 6 }}>{demoRole === 'admin' ? 'Admins see everything, including set-up.' : 'Reviewers see the pages an admin opened for them.'}</div>
            </div>}
      </aside>
      <main className="main">
        {serverMode ? <StatusBanner status={status} /> : <div className="sim-banner" role="note"><strong>Test environment.</strong> The AI is simulated and no real email is read or sent.</div>}
        <Page route={route} isAdmin={isAdmin} access={access} />
      </main>
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
