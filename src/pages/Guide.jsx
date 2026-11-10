import { useApp } from '../store'
import { Card, Icon, PageHeader } from '../components/ui'

const FLOW = [
  ['1', 'An employee emails HR', 'In this test environment you play the employee by typing a message in the Test Lab. In production, the message arrives as a ticket pulled from Zoho Desk.'],
  ['2', 'Your workflow takes over', 'The email follows the blocks you drew on the Workflow page, one after another. You decide what each step is.'],
  ['3', 'Filters and logic route it', 'Risk filters spot sensitive subjects (harassment, legal threats, and so on), including by meaning. If / Else, topic routing and repeat loops send each message down the right path.'],
  ['4', 'The AI reads and writes', 'The AI works out what the message is about and writes a reply using only your Knowledge files, quoting its sources. It never decides where the email goes.'],
  ['5', 'The path ends somewhere', 'Email sent, the Review queue, an escalation to an owner, or closing the case. Anything left unconnected is held for a person. Approved replies go back to the ticket in Zoho Desk.'],
]

export default function Guide() {
  const { serverMode } = useApp()
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
            <li><strong>Test a document.</strong> Upload a policy or paste text, then ask a question about it to see whether the AI uses it.</li>
          </ul>
          <a className="btn" href="#/lab">Open Test Lab</a>
        </Card>
        <Card title="Administration" hint="Where you control how it behaves.">
          <ul className="plain">
            <li><strong>Dashboard.</strong> Volumes, automation rate, and what needs attention.</li>
            <li><strong>Review queue.</strong> Drafts waiting for a person. Edit, save, and send.</li>
            <li><strong>Knowledge files.</strong> The documents the AI may answer from.</li>
            <li><strong>Workflow.</strong> The visual editor where you design how every email is handled, including what counts as "needs human review" and whether replies send automatically.</li>
            <li><strong>Settings.</strong> Tone, signature, the AI engine, and the Zoho Desk connection.</li>
            <li><strong>Activity log.</strong> A record of changes and actions.</li>
          </ul>
          <a className="btn" href="#/admin">Open Dashboard</a>
        </Card>
      </div>

      <div style={{ marginTop: 16 }} />
      <Card title="Safeguards built in">
        <div className="safeguards">
          <div><Icon name="lock" /><div><strong>A design check warns about risks</strong><p className="muted small">If a path could send a flagged or unchecked message with no person involved, the Workflow tells you.</p></div></div>
          <div><Icon name="check" /><div><strong>Careful replies need confirmation</strong><p className="muted small">High-risk replies always require a reviewer to tick a confirmation before they can be sent.</p></div></div>
          <div><Icon name="file" /><div><strong>Answers come from your documents</strong><p className="muted small">Quotes are checked against your files, and the workflow can refuse to send anything without support.</p></div></div>
          <div><Icon name="log" /><div><strong>Changes are logged</strong><p className="muted small">Settings, rule and file changes are recorded in the Activity log, and every case can carry private internal notes.</p></div></div>
        </div>
      </Card>

      <div style={{ marginTop: 16 }} />
      {serverMode ? (
        <Card title="How this live installation behaves">
          <ul className="plain">
            <li>New HR tickets are pulled from Zoho Desk, read by the AI, and drafted. Nothing is emailed to an employee unless an administrator chooses that in Settings.</li>
            <li>By default an approved reply is saved as a private note on the Zoho Desk ticket, so HR sends it from there.</li>
            <li>Settings, the workflow and documents are shared by everyone on the team. Every action is recorded in the Activity log.</li>
            <li>The Test Lab lets you try the workflow with made-up emails. Test emails never touch Zoho Desk.</li>
          </ul>
        </Card>
      ) : (
      <Card title="What is simulated in this test environment">
        <ul className="plain">
          <li>The AI is a stand-in that matches words and searches your documents. The live version uses a language model that understands meaning.</li>
          <li>No real email is read or sent, and Zoho Desk is not connected. That happens in the installed (self-hosted) version.</li>
          <li>Everything you create is stored in your own browser only, and is not shared with colleagues.</li>
        </ul>
      </Card>
      )}
    </>
  )
}
