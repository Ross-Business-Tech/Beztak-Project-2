import { Card, Icon, PageHeader } from '../components/ui'

const FLOW = [
  ['1', 'An employee emails HR', 'In this test environment you play the employee by typing a message in the Test Lab. In production, the message arrives as a ticket pulled from Zoro.'],
  ['2', 'The system checks for risk', 'Every message is screened against your flag rules (harassment, legal threats, mental health, and so on). Anything flagged is never sent without a person.'],
  ['3', 'It searches your documents', 'The AI looks for the answer only in the Knowledge files you have switched on. If it cannot find support, it says so and lowers its confidence.'],
  ['4', 'It writes a reply', 'A draft is prepared in your chosen tone and signature.'],
  ['5', 'It decides what happens next', 'Depending on your reply mode, the draft either waits for a person to review it, or is sent automatically when it is low risk and the AI is confident. Approved replies go back to the ticket in Zoro.'],
]

export default function Guide() {
  return (
    <>
      <PageHeader title="Getting started" subtitle="A short tour of what this tool does and where to find everything." />

      <Card title="How a message moves through the help desk">
        <ol className="flow">
          {FLOW.map(([n, t, d]) => (
            <li key={n}><span className="flow-n">{n}</span><div><strong>{t}</strong><p className="muted">{d}</p></div></li>
          ))}
        </ol>
      </Card>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <Card title="Test Lab" hint="Where you try things safely.">
          <ul className="plain">
            <li><strong>Test emails.</strong> Write a message, or start from an example, and see exactly what the AI would do and why.</li>
            <li><strong>Test documents.</strong> Upload a policy or paste text, then ask a question about it to see whether the AI uses it.</li>
          </ul>
          <a className="btn" href="#/lab">Open Test Lab</a>
        </Card>
        <Card title="Administration" hint="Where you control how it behaves.">
          <ul className="plain">
            <li><strong>Dashboard.</strong> Volumes, automation rate, and what needs attention.</li>
            <li><strong>Review queue.</strong> Drafts waiting for a person. Edit, save, and send.</li>
            <li><strong>Knowledge files.</strong> The documents the AI may answer from.</li>
            <li><strong>Flag rules.</strong> What counts as "needs human review".</li>
            <li><strong>Settings.</strong> Draft or auto-send, tone, limits, and connections.</li>
            <li><strong>Activity log.</strong> A record of changes and actions.</li>
          </ul>
          <a className="btn" href="#/admin">Open Dashboard</a>
        </Card>
      </div>

      <div style={{ marginTop: 16 }} />
      <Card title="Safeguards built in">
        <div className="safeguards">
          <div><Icon name="lock" /><div><strong>Flagged messages never auto-send</strong><p className="muted small">This holds in every reply mode, whatever the AI's confidence.</p></div></div>
          <div><Icon name="check" /><div><strong>High-risk replies need confirmation</strong><p className="muted small">A reviewer must edit the draft and tick a confirmation before it can be sent.</p></div></div>
          <div><Icon name="file" /><div><strong>Answers come from your documents</strong><p className="muted small">An optional setting blocks auto-sending when no document supports the answer.</p></div></div>
          <div><Icon name="log" /><div><strong>Changes are logged</strong><p className="muted small">Settings, rule and file changes are recorded in the Activity log, and every case can carry private internal notes.</p></div></div>
        </div>
      </Card>

      <div style={{ marginTop: 16 }} />
      <Card title="What is simulated in this test environment">
        <ul className="plain">
          <li>The AI is a stand-in that matches words and searches your documents. The production version will use a language model that understands meaning.</li>
          <li>No real email is read or sent. Zoro (your ticketing system) is not connected yet.</li>
          <li>Everything you create is stored in your own browser only, and is not shared with colleagues yet.</li>
        </ul>
      </Card>
    </>
  )
}
