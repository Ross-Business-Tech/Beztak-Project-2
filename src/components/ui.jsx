import { useEffect, useId, useState } from 'react'
import { CATEGORIES } from '../data/defaults'

const PATHS = {
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  folder: 'M3 6h6l2 2h10v11H3z',
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2 .5-1.5-1.5.5-2-3-1-1 2h-2l-1-2-3 1 .5 2L6 8.5 4 8l-1 3 2 1v0l-2 1 1 3 2-.5L7.5 17l-.5 2 3 1 1-2h2l1 2 3-1-.5-2L18 15.5l2 .5 1-3z',
  log: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l4 4 10-10',
  alert: 'M12 8v5M12 17v.5M12 3l10 18H2z',
  dash: 'M6 12h12',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  info: 'M12 11v6M12 7.5v.5M12 3a9 9 0 100 18 9 9 0 000-18z',
  plus: 'M12 5v14M5 12h14',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  chevron: 'M9 6l6 6-6 6',
  brain: 'M9 4a3 3 0 00-3 3v1a3 3 0 00-1 5 3 3 0 003 4h1V4zM15 4a3 3 0 013 3v1a3 3 0 011 5 3 3 0 01-3 4h-1V4z',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5',
  branch: 'M6 4v8M6 12c0 4 4 4 6 4h6M18 16l-3-3M18 16l-3 3',
  loop: 'M4 12a8 8 0 0114-5M20 4v4h-4M20 12a8 8 0 01-14 5M4 20v-4h4',
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0',
  send: 'M3 11l18-8-8 18-2-8z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  split: 'M12 4v6M12 10L6 18M12 10l6 8',
  workflow: 'M4 5h6v5H4zM14 14h6v5h-6zM10 7.5h4a2 2 0 012 2V14',
}
export function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flex: 'none' }}>
      <path d={PATHS[name]} />
    </svg>
  )
}

/** Plain-language "how to use this page" panel. Remembers if it was collapsed. */
export function HelpPanel({ id, title = 'How to use this page', steps, note, defaultOpen = true }) {
  const key = `help-collapsed-${id}`
  const [open, setOpen] = useState(() => { try { const v = localStorage.getItem(key); return v === null ? defaultOpen : v !== '1' } catch { return defaultOpen } })
  const toggle = () => { setOpen(!open); try { localStorage.setItem(key, open ? '1' : '0') } catch { /* ignore */ } }
  return (
    <section className="help" aria-label={title}>
      <button type="button" className="help-head" aria-expanded={open} onClick={toggle}>
        <Icon name="info" /><strong>{title}</strong><span className="help-toggle">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="help-body">
          <ol>{steps.map((st, i) => <li key={i}>{st}</li>)}</ol>
          {note && <p className="muted small">{note}</p>}
        </div>
      )}
    </section>
  )
}

export const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || 'Other'

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}
export const fmtDate = (iso) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
export const fmtSize = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`)

const STATUS = {
  auto_sent: ['Auto-sent', 'green'],
  approved_sent: ['Sent by reviewer', 'green'],
  pending_review: ['Needs review', 'amber'],
  escalated: ['Escalated', 'red'],
  discarded: ['Closed', 'gray'],
}
export function StatusBadge({ status }) {
  const [label, tone] = STATUS[status] || [status, 'gray']
  return <span className={`badge ${tone}`}>{label}</span>
}
export const Badge = ({ tone = 'gray', children }) => <span className={`badge ${tone}`}>{children}</span>
export const SeverityBadge = ({ severity }) => (
  <Badge tone={{ critical: 'red', high: 'amber', medium: 'blue' }[severity] || 'gray'}>{severity[0].toUpperCase() + severity.slice(1)}</Badge>
)

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {children && <div className="head-actions">{children}</div>}
    </header>
  )
}

export const Card = ({ title, hint, actions, children, className = '' }) => (
  <section className={`card ${className}`}>
    {(title || actions) && (
      <div className="card-head">
        <div>
          {title && <h2>{title}</h2>}
          {hint && <p className="muted small">{hint}</p>}
        </div>
        {actions}
      </div>
    )}
    {children}
  </section>
)

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  )
}

export function Field({ label, hint, children }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <p className="muted small">{hint}</p>}
      {typeof children === 'function' ? children(id) : children}
    </div>
  )
}

export function SettingRow({ title, hint, children }) {
  return (
    <div className="setting-row">
      <div>
        <div className="setting-title">{title}</div>
        {hint && <p className="muted small">{hint}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const Empty = ({ title, children }) => (
  <div className="empty"><strong>{title}</strong>{children && <p className="muted">{children}</p>}</div>
)

export function Toasts({ toasts }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={`toast ${t.tone}`}>{t.text}</div>)}
    </div>
  )
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

/** The step-by-step "how the AI decided" list. */
export function Trace({ trace }) {
  const icon = { ok: <Icon name="check" size={13} />, warn: <Icon name="alert" size={13} />, flag: <Icon name="flag" size={13} />, skipped: <Icon name="dash" size={13} /> }
  return (
    <ol className="trace">
      {trace.map((t, i) => (
        <li key={i} className={t.status}>
          <span className="trace-dot" aria-hidden>{icon[t.status]}</span>
          <div><strong>{t.step}</strong><p className="muted small">{t.detail}</p></div>
        </li>
      ))}
    </ol>
  )
}

export function ConfidenceMeter({ value }) {
  const tone = value >= 80 ? 'green' : value >= 55 ? 'amber' : 'red'
  return (
    <div className="meter" role="img" aria-label={`Confidence ${value} percent`}>
      <div className={`meter-fill ${tone}`} style={{ width: `${value}%` }} />
      <span>{value}%</span>
    </div>
  )
}
