import { useEffect, useId } from 'react'
import { CATEGORIES } from '../data/defaults'

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
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const Empty = ({ icon = '📭', title, children }) => (
  <div className="empty"><div className="empty-icon" aria-hidden>{icon}</div><strong>{title}</strong>{children && <p className="muted">{children}</p>}</div>
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
  const icon = { ok: '✓', warn: '!', flag: '⚑', skipped: '–' }
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
