import { useEffect, useRef, useState } from 'react'
import { SAMPLE_QUESTIONS, askAgent } from './hrAgent.js'

const WELCOME = {
  from: 'bot',
  text: 'Hi, I’m the HRITT assistant. I answer common HR questions from the sample employee handbook. Anything sensitive goes straight to a human HR partner.',
}

const TIME = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export default function App() {
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [agent, setAgent] = useState({ topic: null, misses: 0 })
  const [tickets, setTickets] = useState([])
  const logRef = useRef(null)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function send(text) {
    const question = text.trim()
    if (!question) return
    const result = askAgent(question, agent)
    setAgent({ topic: result.topic, misses: result.misses })
    setMessages((m) => [
      ...m,
      { from: 'user', text: question },
      { from: 'bot', text: result.reply, source: result.source, flagged: result.escalate },
    ])
    if (result.escalate) {
      setTickets((t) => [
        {
          id: `HR-${1042 + t.length}`,
          question,
          reasons: result.reasons.join(', '),
          urgency: result.urgency,
          time: TIME(new Date()),
        },
        ...t,
      ])
    }
    setInput('')
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">H</span>
          <div>
            <strong>HRITT</strong>
            <span className="brand-sub">HR Internal Ticketing Tool</span>
          </div>
        </div>
        <span className="pill">Demo · sample data</span>
      </header>

      <main className="hero">
        <div className="intro">
          <h1>Get HR answers fast</h1>
          <p>Ask about leave, pay, benefits or policy. Sensitive topics go straight to a person.</p>
        </div>

        <div className="layout">
          <section className="card chat" aria-label="HR assistant">
            <div className="log" ref={logRef} aria-live="polite">
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.from}`}>
                  <p>{m.text}</p>
                  {m.source && <small className="meta">Source: {m.source}</small>}
                  {m.flagged && <small className="meta flag">Flagged for human review</small>}
                </div>
              ))}
            </div>

            <div className="chips">
              {SAMPLE_QUESTIONS.map((q) => (
                <button key={q} type="button" className="chip" onClick={() => send(q)}>
                  {q}
                </button>
              ))}
            </div>

            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
            >
              <label htmlFor="question" className="sr-only">Your question</label>
              <input
                id="question"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your HR question…"
                autoComplete="off"
              />
              <button type="submit" className="primary" disabled={!input.trim()}>
                Send
              </button>
            </form>
          </section>

          <aside className="card queue" aria-label="HR review queue">
            <h2>HR review queue</h2>
            {tickets.length === 0 ? (
              <p className="muted">Nothing flagged yet. Sensitive or unresolved questions appear here for an HR partner.</p>
            ) : (
              <ul>
                {tickets.map((t) => (
                  <li key={t.id} className="ticket">
                    <div className="ticket-top">
                      <strong>{t.id}</strong>
                      <span className={`badge ${t.urgency.toLowerCase()}`}>{t.urgency}</span>
                    </div>
                    <p className="ticket-q">“{t.question}”</p>
                    <small className="meta">{t.reasons} · {t.time} · Open</small>
                  </li>
                ))}
              </ul>
            )}
            <p className="fine">Demo only: tickets stay in this browser tab and are not sent to HR.</p>
          </aside>
        </div>

        <footer className="fine">Sample handbook content for demonstration. Not HR advice.</footer>
      </main>
    </div>
  )
}
