import { useState } from 'react'
import { useApp } from '../store'
import { TicketActions } from './Lab'
import { Badge, Card, HelpPanel, Icon, ConfidenceMeter, Empty, PageHeader, Segmented, SeverityBadge, StatusBadge, Trace, catLabel, fmtDate, timeAgo } from '../components/ui'

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
      {!selected && <HelpPanel id="review" steps={[
        'Use the filters to see what needs action, what was flagged, or what has already been handled.',
        'Select a message to read the original email, why it needs a person, and the AI draft.',
        'Edit the draft as you would any email. Select Save draft to keep your changes. Nothing is sent until you select Send reply.',
        'Use Case notes to record who you spoke to and what was agreed. Notes stay internal and are kept with the case.',
        'High-risk messages show a red notice and require a confirmation before the Send button turns on. Which messages get that treatment is set in the Workflow.',
      ]} />}
      {selected ? <Detail key={selected.id} email={selected} onBack={() => setSelId(null)} /> : (
        <Card>
          <div className="row between" style={{ marginBottom: 12 }}>
            <Segmented label="Filter" value={filter} onChange={setFilter} options={FILTERS} />
            <input type="search" className="grow" style={{ maxWidth: 280, minWidth: 0 }} placeholder="Search sender or subject" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {list.length === 0 ? <Empty title="Nothing here">{filter === 'open' ? 'No messages are waiting for review.' : 'No messages match.'}</Empty> : (
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
                      {e.result.priority === 'urgent' && <Badge tone="red">Urgent</Badge>}{e.source === 'test' && <Badge tone="blue">Test</Badge>}{e.source === 'import' && <Badge tone="blue">Imported</Badge>}
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
  const { resolveEmail, regenerate, saveDraft, addNote, deleteEmail, toast, settings, serverMode } = useApp()
  const [note, setNote] = useState('')
  const [regen, setRegen] = useState(false)
  const r = email.result
  const open = isOpen(email)
  const highRisk = Boolean(r.requireConfirm)
  const [text, setText] = useState(email.editedDraft ?? r.draft)
  const [checked, setChecked] = useState(false)
  const [saved, setSaved] = useState(email.editedDraft !== undefined)
  const [prevResult, setPrevResult] = useState(r)
  if (prevResult !== r) { setPrevResult(r); setText(r.draft); setSaved(false); setChecked(false) }
  const edited = text !== r.draft
  const onApprove = settings.integrations.zoho.onApprove
  const live = serverMode && email.source === 'zoho'
  const imported = email.source === 'import'
  const sendLabel = imported ? 'Approve and record' : live ? (onApprove === 'send_reply' ? 'Approve and send to employee' : onApprove === 'internal_note' ? 'Approve and save to ticket' : 'Approve') : 'Send reply'
  const sendHint = imported ? 'approving records your decision here. Copy the reply and send it from your own email or help desk' : live ? (onApprove === 'send_reply' ? 'the reply is emailed through Zoho Desk when you approve' : onApprove === 'internal_note' ? 'approving saves the reply as a private note on the Zoho Desk ticket; nothing is emailed to the employee' : 'approving only records the decision here') : 'nothing is sent until you press Send'

  return (
    <>
      <button className="btn small" onClick={onBack} style={{ marginBottom: 14 }}>Back to queue</button>
      <div className="lab-grid">
        <div className="stack">
          <Card title={email.subject} hint={`${email.name} <${email.from}> · ${fmtDate(email.receivedAt)}`}>
            <div className="meta row" style={{ marginBottom: 10 }}>
              <StatusBadge status={email.status} />
              <Badge>{catLabel(r.category)}</Badge>
              {email.source === 'test' && <Badge tone="blue">Test email</Badge>}
              {imported && <Badge tone="blue">Imported</Badge>}
              {email.ticketUrl && <a className="badge blue" href={email.ticketUrl} target="_blank" rel="noreferrer noopener">Ticket {email.ticketNumber ? `#${email.ticketNumber}` : ''}</a>}
            </div>
            <div className="email-box">{email.body}</div>
          </Card>
          <Card title="Why it's here"><ul style={{ margin: 0, paddingLeft: 18 }}>{r.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>
            {r.ticketActions?.length > 0 && <TicketActions actions={r.ticketActions} applied={serverMode && email.source === 'zoho'} />}
            {(r.owner || r.priority === 'urgent' || r.alerts?.length > 0) && (
              <p className="small" style={{ marginTop: 10 }}>{r.priority === 'urgent' && <Badge tone="red">Urgent</Badge>} {r.owner && <>Suggested owner: <strong>{r.owner}</strong>. </>}{r.alerts?.length > 0 && <>Alerted: {r.alerts.map((a) => a.role).join(', ')}.</>}</p>
            )}
            {r.flags.map((f) => (
              <div key={f.ruleId} className="row" style={{ marginTop: 10 }}><SeverityBadge severity={f.severity} /><strong>{f.name}</strong> {f.matched.map((m) => <span key={m} className="chip hit">{m}</span>)}{f.by === 'ai' && <Badge tone="blue">Caught by meaning</Badge>}{f.reason && <span className="muted small" style={{ flexBasis: '100%' }}>Why: {f.reason}</span>}</div>
            ))}
          </Card>
          <Card title="Sources">
            {r.sources.length === 0 ? <p className="muted">No supporting document found.</p> : r.sources.map((s, i) => <div key={i} style={{ marginBottom: 8 }}><strong>{s.name}</strong><div className="quote">{s.snippet}</div></div>)}
          </Card>
          <Card title="Case notes" hint="Internal only. Never sent to the employee.">
            {(email.notes || []).length === 0 ? <p className="muted small" style={{ marginBottom: 10 }}>No notes yet.</p> : (
              <ul className="tl" style={{ marginBottom: 12 }}>{email.notes.map((n) => <li key={n.id}>{n.text}<div className="muted small">{fmtDate(n.at)}</div></li>)}</ul>
            )}
            <textarea rows={3} aria-label="New case note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the team, for example who you spoke to and what was agreed." />
            <div style={{ marginTop: 8 }}><button className="btn small" disabled={!note.trim()} onClick={() => { addNote(email.id, note.trim()); setNote(''); toast('Note added') }}>Add note</button></div>
          </Card>
          <Card title="History"><ul className="tl">{email.history.map((h, i) => <li key={i}>{h.text}<div className="muted small">{fmtDate(h.at)}</div></li>)}</ul></Card>
        </div>

        <div className="stack">
          <Card title={open ? 'Draft reply' : 'Reply'} actions={<ConfidenceMeter value={r.confidence} />}>
            {highRisk && open && <div className="outcome red"><Icon name="flag" /><div><strong>High-risk: please read carefully before sending</strong><p>The AI wrote a cautious starting draft. Rewrite it in your own words if needed. It cannot be sent until you confirm below.</p></div></div>}
            {open ? (
              <div className="compose">
                <div className="compose-line"><span>To</span><strong>{email.name} &lt;{email.from}&gt;</strong></div>
                <div className="compose-line"><span>From</span><span>{settings.helpDeskName} &lt;{settings.replyToAddress}&gt;</span></div>
                <div className="compose-line"><span>Subject</span><strong>Re: {email.subject}</strong></div>
                <textarea id="reply" aria-label="Reply body" rows={14} value={text} onChange={(e) => { setText(e.target.value); setSaved(false) }} placeholder="Type your reply…" />
                <div className="row between" style={{ margin: '6px 0 10px' }}>
                  <span className="muted small">{saved ? 'Draft saved' : edited ? 'Unsaved edits' : 'AI draft, not yet edited'} · {sendHint}</span>
                  <span className="row"><button className="btn small" onClick={() => { navigator.clipboard?.writeText(text).then(() => toast('Reply copied'), () => toast('Could not copy. Select the text and copy it.', 'warn')) }}>Copy reply</button>
                  <button className="btn small" onClick={() => { saveDraft(email.id, text); setSaved(true); toast('Draft saved') }}>Save draft</button></span>
                </div>
                {highRisk && (
                  <label className="confirm-box"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> I have read this message and edited the reply as needed. It is appropriate to send.</label>
                )}
                <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
                  <button className="btn primary" disabled={!text.trim() || (highRisk && !checked)} onClick={async () => { const r = await resolveEmail(email.id, 'send', text); toast(r.message, r.ok ? 'ok' : 'warn'); if (r.ok) onBack() }}>{sendLabel}</button>
                  <button className="btn" onClick={async () => { setRegen(true); await regenerate(email.id); setRegen(false); toast('Draft regenerated') }} disabled={regen}>{regen ? 'Rewriting...' : 'Regenerate'}</button>
                  <button className="btn danger" onClick={async () => { const r = await resolveEmail(email.id, 'discard'); if (r.ok) onBack() }}>Close without reply</button>
                </div>
              </div>
            ) : email.finalReply ? <div className="draft-box">{email.finalReply}</div> : <p className="muted">Closed without a reply.</p>}
          </Card>
          <Card title="How it decided"><Trace trace={r.trace} /></Card>
          <button className="btn small danger" style={{ justifySelf: 'start' }} onClick={async () => { const r = await deleteEmail(email.id); if (r?.ok === false) return; onBack() }}>Delete this record</button>
        </div>
      </div>
    </>
  )
}
