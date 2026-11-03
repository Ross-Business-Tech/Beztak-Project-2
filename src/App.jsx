import { useMemo, useState } from 'react'
import { TICKETS } from './tickets.js'
import { draftReply } from './draft.js'
import './App.css'

const AUTO_THRESHOLD = 85

export default function App() {
  const drafts = useMemo(() => Object.fromEntries(TICKETS.map((t) => [t.id, draftReply(t)])), [])
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState({}) // id -> 'sent' | 'auto'
  const [edits, setEdits] = useState({})
  const [auto, setAuto] = useState(false)
  const [openCite, setOpenCite] = useState(null)

  const statusOf = (t) => status[t.id] || (auto && drafts[t.id].confidence >= AUTO_THRESHOLD && !drafts[t.id].flag ? 'auto' : 'open')
  const open = TICKETS.filter((t) => statusOf(t) === 'open').length
  const ticket = TICKETS.find((t) => t.id === selected)
  const draft = ticket && drafts[ticket.id]
  const text = ticket ? (edits[ticket.id] ?? draft.text) : ''
  const minutesSaved = TICKETS.filter((t) => statusOf(t) !== 'open').length * 12

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Beztak HR Assistant</h1>
          <p className="sub">{open} open · about {minutesSaved} min of HR time saved today</p>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span>Auto-send high-confidence replies (≥{AUTO_THRESHOLD}%)</span>
        </label>
      </header>

      <div className={'layout' + (ticket ? ' has-selection' : '')}>
        <ul className="list" aria-label="HR tickets">
          {TICKETS.map((t) => {
            const st = statusOf(t)
            const d = drafts[t.id]
            return (
              <li key={t.id}>
                <button className={'row' + (t.id === selected ? ' active' : '')} onClick={() => { setSelected(t.id); setOpenCite(null) }}>
                  <span className="row-top"><b>{t.from}</b><span className="time">{t.received}</span></span>
                  <span className="row-subject">{t.subject}</span>
                  <span className="row-meta">
                    {st === 'open' ? <span className={'pill ' + (d.flag ? 'warn' : 'ok')}>{d.flag ? 'Needs review' : `Draft ready · ${d.confidence}%`}</span>
                      : <span className="pill done">{st === 'auto' ? 'Auto-sent' : 'Sent'}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <main className="detail">
          {!ticket ? (
            <div className="empty">Select a ticket to see the AI-drafted reply and the handbook sections it cites.</div>
          ) : (
            <>
              <button className="back" onClick={() => setSelected(null)}>← All tickets</button>
              <div className="card">
                <div className="meta">{ticket.id} · {ticket.from}, {ticket.role}</div>
                <h2>{ticket.subject}</h2>
                <p className="question">{ticket.body}</p>
              </div>

              <div className="card">
                <div className="draft-head">
                  <h3>AI-drafted reply</h3>
                  <span className={'conf ' + (draft.confidence >= AUTO_THRESHOLD ? 'hi' : draft.confidence >= 50 ? 'mid' : 'lo')}>{draft.confidence}% confident</span>
                </div>
                {draft.flag && <div className="flag">⚠ {draft.flag}</div>}
                <textarea
                  value={text}
                  disabled={statusOf(ticket) !== 'open'}
                  onChange={(e) => setEdits({ ...edits, [ticket.id]: e.target.value })}
                  rows={12}
                />
                {draft.citations.length > 0 && (
                  <div className="cites">
                    <div className="cites-title">Sources from the employee handbook</div>
                    {draft.citations.map((c) => (
                      <div key={c.id} className="cite">
                        <button onClick={() => setOpenCite(openCite === c.id ? null : c.id)}>§{c.section} {c.title} {openCite === c.id ? '▾' : '▸'}</button>
                        {openCite === c.id && <blockquote>{c.text}</blockquote>}
                      </div>
                    ))}
                  </div>
                )}
                {statusOf(ticket) === 'open' ? (
                  <div className="actions">
                    <button className="primary" onClick={() => setStatus({ ...status, [ticket.id]: 'sent' })}>Approve &amp; send</button>
                    <button onClick={() => setEdits({ ...edits, [ticket.id]: undefined })}>Reset draft</button>
                  </div>
                ) : <div className="sent">✓ Reply {statusOf(ticket) === 'auto' ? 'sent automatically' : 'sent'} to {ticket.from}</div>}
              </div>
            </>
          )}
        </main>
      </div>
      <footer className="note">Demo with made-up employees and a sample handbook. Drafts are matched to handbook sections by keyword; the real version will use an AI model.</footer>
    </div>
  )
}
