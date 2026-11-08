import { useEffect, useRef, useState } from 'react'
import { COMPANY, TOPICS, respond } from './handbook.js'
import Skyline from './Skyline.jsx'
import './App.css'

const SUGGESTED = [
  'How much vacation do I get?',
  'When is payday?',
  'Can I work from home?',
  'Do we get a rent discount?',
]

const WELCOME = {
  from: 'bot',
  text: [
    `Hi! I'm the ${COMPANY} HR assistant. Ask me anything from the employee handbook: time off, pay, benefits, remote work and more.`,
    'Anything sensitive, like harassment or safety concerns, goes straight to a real person on the HR team.',
  ],
  chips: SUGGESTED,
}

function loadTickets() {
  try {
    return JSON.parse(localStorage.getItem('hritt-tickets')) || []
  } catch {
    return []
  }
}

function App() {
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [context, setContext] = useState({ topicId: null, misses: 0 })
  const [tickets, setTickets] = useState(loadTickets)
  const [lastQuestion, setLastQuestion] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem('hritt-tickets', JSON.stringify(tickets))
    } catch {
      /* storage not available; tickets just won't be remembered */
    }
  }, [tickets])

  useEffect(() => {
    if (messages.length > 1) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  function createTicket(category, summary, priority) {
    const id = `HR-${1040 + tickets.length + 1}`
    const ticket = {
      id,
      category,
      summary: summary.length > 90 ? `${summary.slice(0, 87)}...` : summary,
      priority,
      status: priority === 'Urgent' ? 'Flagged for HR review' : 'Waiting for HR',
      created: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    }
    setTickets((t) => [ticket, ...t])
    return ticket
  }

  function botSays(reply) {
    setMessages((m) => [...m, { from: 'bot', ...reply }])
  }

  function escalate(reason, question) {
    const ticket = createTicket(reason, question || lastQuestion || reason, 'Normal')
    botSays({
      text: [
        `I've sent this to the HR team as ticket ${ticket.id}. Someone will reply within 1 business day.`,
        'You can keep asking me handbook questions in the meantime.',
      ],
      ticket,
    })
  }

  function send(raw) {
    const message = raw.trim()
    if (!message) return
    setMessages((m) => [...m, { from: 'user', text: [message] }])
    setInput('')

    const result = respond(message, context)
    setContext(result.nextContext)
    setLastQuestion(message)

    switch (result.kind) {
      case 'flag': {
        const ticket = createTicket(result.flags.join(', '), message, 'Urgent')
        botSays({
          flagged: true,
          text: [
            `Thank you for telling us. Because this may involve ${result.flags.join(' and ').toLowerCase()}, I've flagged it for confidential review by a person on the HR team. I won't try to handle it myself.`,
            `Your ticket is ${ticket.id}. An HR team member will contact you privately within 4 business hours.`,
            'If anyone is in immediate danger, call 911. You can also report anonymously on the Ethics Hotline: 1-800-555-0142 (sample number).',
          ],
          ticket,
        })
        break
      }
      case 'human':
        escalate(result.escalateReason, message)
        break
      case 'personal':
        botSays({
          text: ['That needs someone who can look at your personal records, which I can\'t do.'],
          actions: [{ label: 'Send to HR', reason: result.escalateReason, question: message }],
        })
        break
      case 'answer':
      case 'answer-escalate':
        botSays({
          text: result.text,
          source: `${result.topic.title} · ${result.topic.section}`,
          actions: result.kind === 'answer-escalate' ? [{ label: 'Send to HR', reason: result.escalateReason, question: message }] : undefined,
          chips: result.kind === 'answer' ? ['That answered it', 'I need to talk to HR'] : undefined,
        })
        break
      case 'unsure-followup':
        botSays({
          text: [`The handbook doesn't cover that detail about ${result.topic.title.toLowerCase()}. A person on the HR team can answer it.`],
          actions: [{ label: 'Send to HR', reason: `Follow-up: ${result.topic.title}`, question: message }],
        })
        break
      case 'unknown':
        botSays({
          text: ['I couldn\'t find that in the employee handbook. Could you say it another way? These are topics I know:'],
          chips: TOPICS.slice(0, 6).map((t) => t.title),
        })
        break
      default:
        botSays({
          text: ['I still can\'t find an answer in the handbook, so this looks like one for a person.'],
          actions: [{ label: 'Send to HR', reason: 'Not covered by handbook', question: message }],
        })
    }
  }

  function onChip(chip) {
    if (chip === 'That answered it') {
      setMessages((m) => [...m, { from: 'user', text: [chip] }, { from: 'bot', text: ['Great! Anything else I can help with?'] }])
      return
    }
    if (chip === 'I need to talk to HR') {
      setMessages((m) => [...m, { from: 'user', text: [chip] }])
      escalate(`Follow-up: ${TOPICS.find((t) => t.id === context.topicId)?.title || 'General'}`)
      return
    }
    send(chip)
  }

  function onAction(action) {
    setMessages((m) => m.map((msg) => (msg.actions?.includes(action) ? { ...msg, actions: undefined } : msg)))
    escalate(action.reason, action.question)
  }

  const flaggedCount = tickets.filter((t) => t.priority === 'Urgent').length
  const last = messages.length - 1

  return (
    <div className="page">
      <Skyline />
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 21V9l9-6 9 6v12h-6v-7H9v7z" fill="currentColor" /></svg>
          </span>
          <div>
            <strong>HRITT</strong>
            <span className="brand-sub">{COMPANY} · HR Help Desk</span>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="chat card" aria-label="HR assistant chat">
          <div className="chat-head">
            <div>
              <h1>Ask HR</h1>
              <p>Instant answers from the employee handbook</p>
            </div>
            <span className="status"><span className="dot" />Online</span>
          </div>

          <div className="messages" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.from} ${m.flagged ? 'flagged' : ''}`}>
                {m.flagged && <div className="flag-label">⚑ Flagged for human review</div>}
                {m.text.map((p, j) => <p key={j}>{p}</p>)}
                {m.source && <div className="source">Source: {m.source}</div>}
                {m.ticket && (
                  <div className="ticket-inline">
                    <strong>{m.ticket.id}</strong> · {m.ticket.status}
                  </div>
                )}
                {m.actions && (
                  <div className="actions">
                    {m.actions.map((a) => (
                      <button key={a.label} type="button" className="btn-primary" onClick={() => onAction(a)}>{a.label}</button>
                    ))}
                  </div>
                )}
                {m.chips && i === last && (
                  <div className="chips">
                    {m.chips.map((c) => (
                      <button key={c} type="button" className="chip" onClick={() => onChip(c)}>{c}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your HR question..."
              aria-label="Your question"
              maxLength={500}
            />
            <button type="submit" className="btn-primary" disabled={!input.trim()}>Send</button>
          </form>
          <p className="disclaimer">Demo with a made-up handbook. Don't enter real personal information.</p>
        </section>

        <aside className="side">
          <section className="card">
            <h2>My tickets</h2>
            {tickets.length === 0 ? (
              <p className="muted">No tickets yet. When a question needs a person, it shows up here.</p>
            ) : (
              <>
                {flaggedCount > 0 && <p className="flag-count">{flaggedCount} flagged for human review</p>}
                <ul className="tickets">
                  {tickets.map((t) => (
                    <li key={t.id} className={t.priority === 'Urgent' ? 'urgent' : ''}>
                      <div className="ticket-top">
                        <strong>{t.id}</strong>
                        <span className={`badge ${t.priority === 'Urgent' ? 'badge-urgent' : ''}`}>{t.priority === 'Urgent' ? 'Flagged' : 'Open'}</span>
                      </div>
                      <div className="ticket-cat">{t.category}</div>
                      <div className="muted small">“{t.summary}”</div>
                      <div className="muted small">{t.created} · {t.status}</div>
                    </li>
                  ))}
                </ul>
                <button type="button" className="link" onClick={() => setTickets([])}>Clear tickets</button>
              </>
            )}
          </section>

          <section className="card">
            <h2>Handbook topics</h2>
            <div className="chips">
              {TOPICS.map((t) => (
                <button key={t.id} type="button" className="chip" onClick={() => send(t.title)}>{t.title}</button>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App
