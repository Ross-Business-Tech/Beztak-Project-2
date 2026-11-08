import { useState } from 'react'
import { useApp } from '../store'
import { SCENARIOS } from '../data/defaults'
import { Uploader } from '../components/Uploader'
import { Badge, Card, HelpPanel, Icon, ConfidenceMeter, Empty, Field, PageHeader, SeverityBadge, StatusBadge, Trace, catLabel, fmtSize, timeAgo } from '../components/ui'

const BLANK = { name: '', from: '', subject: '', body: '' }

export default function Lab({ route }) {
  const tab = route.includes('docs') ? 'docs' : 'email'
  return (
    <>
      <PageHeader title="Test Lab" subtitle="Try the help desk safely. Nothing here reads or sends real email." />
      <div className="tabs" role="tablist">
        <a href="#/lab" className={tab === 'email' ? 'on' : ''} role="tab" aria-selected={tab === 'email'}>Test emails</a>
        <a href="#/lab/docs" className={tab === 'docs' ? 'on' : ''} role="tab" aria-selected={tab === 'docs'}>Test documents</a>
      </div>
      {tab === 'email' ? (
        <HelpPanel id="lab-email" steps={[
          'Choose an example from the list, or write your own message as if you were an employee.',
          'Your Workflow decides what happens to it. To change the outcome, edit the blocks on the Workflow page, then send the same example again.',
          'Select Send test email. The result appears on the right: what the AI decided, the reply, anything flagged, the documents it used, and its reasoning.',
          'If the result says a person must review it, open it in the Review queue to edit and approve it.',
        ]} note="To test an answer from your own documents, add one under Test documents first, then ask a question about it here." />
      ) : (
        <HelpPanel id="lab-docs" steps={[
          'Upload a text, Markdown or CSV file, or select "Paste text as a document" and type or paste a policy.',
          'Go to Test emails and ask a question the document answers. The AI will quote the relevant passage.',
          'Turn a document off to confirm the AI stops using it, or remove it when you are finished.',
        ]} note="PDF and Word files can be stored but not read in this test environment. Paste their text instead." />
      )}
      {tab === 'email' ? <EmailTab /> : <DocsTab />}
    </>
  )
}

function EmailTab() {
  const { emails, sendTestEmail, clearTestEmails, toast } = useApp()
  const [form, setForm] = useState(BLANK)
  const [selId, setSelId] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const tests = emails.filter((e) => e.source === 'test')
  const selected = emails.find((e) => e.id === selId) || tests[0]

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const sent = await sendTestEmail({ ...form, from: form.from.trim() || 'test.employee@example.com', name: form.name.trim() || 'Test Employee' })
      setSelId(sent.id)
      toast(sent.result.aiFallback ? 'Processed with the simulated engine. The AI was not reachable.' : 'Test email processed. See the result on the right.', sent.result.aiFallback ? 'warn' : 'ok')
    } finally { setBusy(false) }
  }
  function loadScenario(id) {
    const s = SCENARIOS.find((x) => x.id === id)
    if (s) setForm({ name: s.name, from: s.from, subject: s.subject, body: s.body })
  }

  return (
    <div className="lab-grid">
      <div className="stack">
        <Card title="Write a test email" hint="Pretend to be an employee writing to HR.">
          <form onSubmit={submit}>
            <Field label="Start from an example">
              {(id) => (
                <select id={id} value="" onChange={(e) => loadScenario(e.target.value)}>
                  <option value="">Choose an example…</option>
                  {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              )}
            </Field>
            <div className="two-col">
              <Field label="Sender name">{(id) => <input id={id} type="text" value={form.name} onChange={set('name')} placeholder="Test Employee" />}</Field>
              <Field label="Sender email">{(id) => <input id={id} type="email" value={form.from} onChange={set('from')} placeholder="test.employee@example.com" />}</Field>
            </div>
            <Field label="Subject">{(id) => <input id={id} type="text" required value={form.subject} onChange={set('subject')} />}</Field>
            <Field label="Message">{(id) => <textarea id={id} required rows={8} value={form.body} onChange={set('body')} />}</Field>
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn primary" type="submit" disabled={busy}>{busy ? 'The AI is reading it...' : 'Send test email'}</button>
              <button className="btn" type="button" onClick={() => setForm(BLANK)}>Clear</button>
            </div>
          </form>
        </Card>

        <Card title="Test history" actions={tests.length > 0 && <button className="btn small" onClick={clearTestEmails}>Clear all</button>}>
          {tests.length === 0 ? <Empty title="No test emails yet">Send one above and it will show up here.</Empty> : (
            <div className="list">
              {tests.map((e) => (
                <button key={e.id} className={`item ${selected?.id === e.id ? 'sel' : ''}`} onClick={() => setSelId(e.id)}>
                  <div className="body">
                    <div className="truncate cell-title">{e.subject}</div>
                    <div className="meta"><StatusBadge status={e.status} /><span className="muted small">{timeAgo(e.receivedAt)}</span></div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="stack">
        {selected ? <Result email={selected} /> : (
          <Card><Empty title="The AI's answer will appear here">Send a test email, or pick an example, to see the draft, what got flagged, and why the AI decided what it did.</Empty></Card>
        )}
      </div>
    </div>
  )
}

export function Result({ email }) {
  const r = email.result
  const tone = r.decision === 'sent' ? 'green' : r.decision === 'escalated' || r.requireConfirm ? 'red' : r.decision === 'closed' ? 'gray' : 'amber'
  const headline = { sent: 'Reply sent automatically', review: r.ready ? 'Reply is ready, waiting for a person to approve it' : 'Draft is waiting for a person to review', escalated: `Escalated${r.owner ? ` to ${r.owner}` : ''}: a person must handle it`, closed: 'Closed without a reply' }[r.decision]
  return (
    <>
      <Card title="What the AI did" actions={r.engine === 'ai' ? <Badge tone="green">AI model: {r.model}</Badge> : <Badge tone="gray">Simulated engine</Badge>}>
        {r.aiFallback && <div className="outcome amber"><Icon name="alert" /><div><strong>The real AI was not used for this message</strong><p>{r.aiFallback} The simulated engine, which matches words only, answered instead.</p></div></div>}
        <div className={`outcome ${tone}`}>
          <Icon name={{ green: 'check', amber: 'mail', red: 'flag', gray: 'dash' }[tone]} />
          <div><strong>{headline}</strong>{r.reasons.map((x, i) => <p key={i}>{x}</p>)}</div>
        </div>
        {r.alerts?.length > 0 && <p className="small" style={{ marginBottom: 10 }}><strong>Alerts sent:</strong> {r.alerts.map((a) => `${a.role}: ${a.message}`).join(' · ')}</p>}
        <div className="two-col">
          <div><div className="muted small">Topic</div><strong>{catLabel(r.category)}</strong></div>
          <div><div className="muted small">Confidence</div><ConfidenceMeter value={r.confidence} /></div>
        </div>
        {r.flags.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="muted small">Flags triggered</div>
            {r.flags.map((f) => (
              <div key={f.ruleId} className="row" style={{ marginTop: 6 }}>
                <SeverityBadge severity={f.severity} /> <strong>{f.name}</strong>
                {f.matched.length > 0 && <span className="muted small">words: {f.matched.map((m) => <span key={m} className="chip hit">{m}</span>)}</span>}
                {f.by === 'ai' && <Badge tone="blue">Caught by meaning</Badge>}
                {f.reason && <span className="muted small" style={{ flexBasis: '100%' }}>Why: {f.reason}</span>}
              </div>
            ))}
            <p className="muted small" style={{ marginTop: 6 }}>Suggested owner: {[...new Set(r.flags.map((f) => f.notify))].join(', ')}. It will be marked as a priority in the Review queue.</p>
          </div>
        )}
      </Card>

      {r.decision !== 'closed' && (
        <Card title={r.decision === 'sent' ? 'Reply that was sent' : 'Draft saved'}>
          {r.requireConfirm && <p className="muted small" style={{ marginBottom: 8 }}>High-risk: this draft waits in the review queue. Nothing is sent until a person edits and confirms it.</p>}
          {r.draft ? <div className="draft-box">{email.editedDraft || r.draft}</div> : <p className="muted">No reply was written on this path.</p>}
          <div className="row" style={{ marginTop: 12 }}>
            {email.status === 'pending_review' || email.status === 'escalated'
              ? <a className="btn small" href="#/admin/review">Open draft in review queue</a>
              : <span className="muted small">Status: <StatusBadge status={email.status} /></span>}
            <a className="btn small" href="#/admin/workflow">Edit the workflow</a>
          </div>
        </Card>
      )}

      <Card title="Sources used">
        {r.sources.length === 0 ? <p className="muted">No document supported an answer. Try uploading one in the Test documents tab.</p> : r.sources.map((s, i) => (
          <div key={i} style={{ marginBottom: 8 }}><strong>{s.name}</strong><div className="quote">{s.snippet}</div></div>
        ))}
      </Card>

      <Card title="How it decided" hint="Each block the email went through, in order."><Trace trace={r.trace} /></Card>
    </>
  )
}

function DocsTab() {
  const { files, updateFile, deleteFile, toast } = useApp()
  const tests = files.filter((f) => f.test)
  return (
    <div className="grid-2">
      <Card title="Upload test documents" hint="Add a policy or FAQ, then go to Test emails and ask a question about it.">
        <Uploader test folder="Other" />
        <p className="muted small" style={{ marginTop: 14 }}>Tip: Test documents are used right away by the AI. Real documents live in Admin Knowledge files.</p>
      </Card>
      <Card title={`Your test documents (${tests.length})`}>
        {tests.length === 0 ? <Empty title="No test documents yet">Upload a file or paste text to get started.</Empty> : (
          <div className="list">
            {tests.map((f) => (
              <div key={f.id} className="item" style={{ cursor: 'default' }}>
                <div className="body">
                  <div className="cell-title truncate">{f.name}</div>
                  <div className="meta">
                    <span className="muted small">{fmtSize(f.size)}</span>
                    {!f.extracted && <Badge tone="amber">Not readable yet</Badge>}
                    {!f.active && <Badge>Off</Badge>}
                  </div>
                </div>
                <button className="btn small" onClick={() => updateFile(f.id, { active: !f.active })}>{f.active ? 'Turn off' : 'Turn on'}</button>
                <button className="btn small danger" onClick={() => { deleteFile(f.id); toast('Removed ' + f.name) }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
