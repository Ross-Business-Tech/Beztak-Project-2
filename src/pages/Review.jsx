import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { Badge, Card, ConfidenceMeter, Empty, PageHeader, Segmented, SeverityBadge, StatusBadge, Trace, catLabel, fmtDate, timeAgo } from '../components/ui'

const FILTERS = [
  { value: 'open', label: 'Needs action' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'done', label: 'Handled' },
  { value: 'all', label: 'All' },
]
const topSeverity = (flags) => ['critical', 'high', 'medium'].find((s) => flags.some((f) => f.severity === s))
const isOpen = (e) => e.status === 'pending_review' || e.status === 'escalated'

export default function Review() {
  const { emails } = useApp()
  const [filter, setFilter] = useState('open')
  const [q, setQ] = useState('')
  const [selId, setSelId] = useState(null)

  const list = emails.filter((e) => {
    if (filter === 'open' && !isOpen(e)) return false
    if (filter === 'flagged' && e.result.flags.length === 0) return false
    if (filter === 'done' && isOpen(e)) return false
    const t = `${e.subject} ${e.name} ${e.from}`.toLowerCase()
    return t.includes(q.toLowerCase())
  })
  const selected = emails.find((e) => e.id === selId) || null

  return (
    <>
      <PageHeader title="Review queue" subtitle="Drafts and flagged messages that need a person." />
      {selected ? <Detail key={selected.id} email={selected} onBack={() => setSelId(null)} /> : (
        <Card>
          <div className="row between" style={{ marginBottom: 12 }}>
            <Segmented label="Filter" value={filter} onChange={setFilter} options={FILTERS} />
            <input type="search" className="grow" style={{ maxWidth: 280, minWidth: 0 }} placeholder="Search sender or subject" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {list.length === 0 ? <Empty icon="🎉" title="Nothing here">{filter === 'open' ? 'No messages are waiting for review.' : 'No messages match.'}</Empty> : (
            <div className="list">
              {list.map((e) => (
                <button key={e.id} className="item" onClick={() => setSelId(e.id)}>
                  <div className="avatar" aria-hidden>{(e.name || '?')[0]}</div>
                  <div className="body">
                    <div className="truncate cell-title">{e.subject}</div>
                    <div className="truncate muted small">{e.name} · {catLabel(e.result.category)}</div>
                    <div className="meta" style={{ marginTop: 4 }}>
                      <StatusBadge status={e.status} />
                      {e.result.flags.length > 0 && <SeverityBadge severity={topSeverity(e.result.flags)} />}
                      {e.result.flags.length > 0 && <span className="small muted">{e.result.flags.map((f) => f.name).join(', ')}</span>}
                      {e.source === 'test' && <Badge tone="blue">Test</Badge>}
                    </div>
                  </div>
                  <span className="muted small" style={{ whiteSpace: 'nowrap', flex: 'none' }}>{timeAgo(e.receivedAt)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  )
}

function Detail({ email, onBack }) {
  const { resolveEmail, regenerate, deleteEmail, toast } = useApp()
  const [text, setText] = useState(email.result.draft)
  const r = email.result
  const open = isOpen(email)
  useEffect(() => { setText(email.result.draft) }, [email.result])

  return (
    <>
      <button className="btn small" onClick={onBack} style={{ marginBottom: 14 }}>← Back to queue</button>
      <div className="lab-grid">
        <div className="stack">
          <Card title={email.subject} hint={`${email.name} <${email.from}> · ${fmtDate(email.receivedAt)}`}>
            <div className="meta row" style={{ marginBottom: 10 }}>
              <StatusBadge status={email.status} />
              <Badge>{catLabel(r.category)}</Badge>
              {email.source === 'test' && <Badge tone="blue">Test email</Badge>}
            </div>
            <div className="email-box">{email.body}</div>
          </Card>
          <Card title="Why it's here"><ul style={{ margin: 0, paddingLeft: 18 }}>{r.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>
            {r.flags.map((f) => (
              <div key={f.ruleId} className="row" style={{ marginTop: 10 }}><SeverityBadge severity={f.severity} /><strong>{f.name}</strong> {f.matched.map((m) => <span key={m} className="chip hit">{m}</span>)}</div>
            ))}
          </Card>
          <Card title="History"><ul className="tl">{email.history.map((h, i) => <li key={i}>{h.text}<div className="muted small">{fmtDate(h.at)}</div></li>)}</ul></Card>
        </div>

        <div className="stack">
          <Card title={open ? (email.status === 'escalated' ? 'Write your reply' : 'Review the draft') : 'Reply'} actions={<ConfidenceMeter value={r.confidence} />}>
            {email.status === 'escalated' && <div className="outcome red"><span aria-hidden>🚩</span><div><strong>Handle this personally</strong><p>The AI did not write a reply because of the flag. Contact the employee privately.</p></div></div>}
            {open ? (
              <>
                <label htmlFor="reply" className="muted small">You can edit before sending</label>
                <textarea id="reply" rows={13} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your reply…" />
                <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
                  <button className="btn primary" disabled={!text.trim()} onClick={() => { resolveEmail(email.id, 'send', text); toast('Reply sent (simulated, no real email)') ; onBack() }}>Send reply</button>
                  {email.status !== 'escalated' && <button className="btn" onClick={() => { regenerate(email.id); toast('Draft regenerated') }}>Regenerate</button>}
                  <button className="btn danger" onClick={() => { resolveEmail(email.id, 'discard'); onBack() }}>Close without reply</button>
                </div>
              </>
            ) : email.finalReply ? <div className="draft-box">{email.finalReply}</div> : <p className="muted">Closed without a reply.</p>}
          </Card>
          <Card title="Sources">
            {r.sources.length === 0 ? <p className="muted">No supporting document found.</p> : r.sources.map((s, i) => <div key={i} style={{ marginBottom: 8 }}><strong>📄 {s.name}</strong><div className="quote">{s.snippet}</div></div>)}
          </Card>
          <Card title="How it decided"><Trace trace={r.trace} /></Card>
          <button className="btn small danger" style={{ justifySelf: 'start' }} onClick={() => { deleteEmail(email.id); onBack() }}>Delete this record</button>
        </div>
      </div>
    </>
  )
}
