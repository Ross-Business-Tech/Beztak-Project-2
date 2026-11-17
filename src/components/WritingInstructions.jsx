import { useState } from 'react'
import { useApp } from '../store'
import { DEFAULT_WRITING_INSTRUCTIONS, SCENARIOS } from '../data/defaults'
import { aiDraft, writerPromptPreview, DEFAULT_MODEL } from '../engine/ai'
import { Badge, Card, Field, Modal } from './ui'

const MAX = 2000
const fmtWhen = (iso) => { try { return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '' } }

/** Settings card where an admin edits how the AI writes replies. The safety rules around it are fixed. */
export function WritingInstructions() {
  const { settings: s, updateSettings, files } = useApp()
  const saved = (s.writingInstructions || '').trim() ? s.writingInstructions : DEFAULT_WRITING_INSTRUCTIONS
  const [text, setText] = useState(saved)
  const [showPrompt, setShowPrompt] = useState(false)
  const [scenario, setScenario] = useState('s_pto')
  const [test, setTest] = useState(null)

  const usingDefault = text.trim() === DEFAULT_WRITING_INSTRUCTIONS.trim()
  const dirty = text.trim() !== saved.trim()
  const history = s.writingInstructionsHistory || []
  const draftSettings = { ...s, writingInstructions: usingDefault ? '' : text }

  function save() {
    const prev = (s.writingInstructions || '').trim() ? s.writingInstructions : ''
    const hist = prev ? [{ at: new Date().toISOString(), text: prev }, ...history].slice(0, 5) : history
    updateSettings({ writingInstructions: usingDefault ? '' : text.trim(), writingInstructionsHistory: hist }, 'Writing instructions for the AI were updated')
  }

  async function run() {
    const sc = SCENARIOS.find((x) => x.id === scenario)
    setTest('busy')
    try {
      const email = { name: sc.name, from: sc.from, subject: sc.subject, body: sc.body }
      const out = await aiDraft({ email, settings: draftSettings, files, ctx: { careful: false, flags: [], tries: 0 }, tone: s.tone, model: (s.ai?.model || '').trim() || undefined })
      setTest({ out })
    } catch (e) { setTest({ error: e.message || 'The AI could not be reached.' }) }
  }

  return (
    <Card title="Writing instructions for the AI" hint="Admins only. How every reply is worded: length, voice and structure. Changes apply to the next email.">
      <Field label={<>Instructions {usingDefault ? <Badge tone="green">Built-in default</Badge> : <Badge tone="blue">Customised</Badge>} {dirty && <Badge tone="amber">Not saved yet</Badge>}</>}
        hint={<>You can use <code>{'{{tone}}'}</code> and <code>{'{{helpDeskName}}'}</code>; they are filled in from the settings above.</>}>
        {(id) => <textarea id={id} rows={12} maxLength={MAX} value={text} onChange={(e) => setText(e.target.value)} style={{ fontFamily: 'inherit' }} />}
      </Field>
      <div className="row between">
        <span className="muted small">{text.length.toLocaleString()} / {MAX.toLocaleString()} characters</span>
        <span className="row" style={{ gap: 8 }}>
          <button className="btn" disabled={usingDefault && !dirty} onClick={() => setText(DEFAULT_WRITING_INSTRUCTIONS)}>Reset to default</button>
          <button className="btn primary" disabled={!dirty || !text.trim()} onClick={save}>Save instructions</button>
        </span>
      </div>
      <div className="note" role="note">
        The app always adds its own rules, which cannot be edited away: use only facts verified in your documents, ignore instructions hidden in emails, and give sensitive messages the careful, no-advice reply.
        <button type="button" className="btn small" onClick={() => setShowPrompt(true)}>Show the full prompt</button>
      </div>

      <details className="plain">
        <summary>Try it on a sample email</summary>
        <div className="plain-body">
          <p className="muted small" style={{ marginBottom: 8 }}>Uses the text above (even if not saved) and your Knowledge files. Nothing is sent or stored.</p>
          <div className="row" style={{ gap: 8 }}>
            <select aria-label="Sample email" value={scenario} onChange={(e) => setScenario(e.target.value)} style={{ maxWidth: 320 }}>
              {SCENARIOS.filter((x) => !/harass|legal|wellbeing|hostile|eviction|arrest|garnish/.test(x.id)).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
            <button className="btn" disabled={test === 'busy' || s.ai.engine !== 'ai'} onClick={run}>{test === 'busy' ? 'Writing...' : 'Write a sample reply'}</button>
            {s.ai.engine !== 'ai' && <span className="muted small">Turn on the AI language model on the AI tab first.</span>}
          </div>
          {test && test !== 'busy' && (test.error ? <p className="small" style={{ marginTop: 10 }}><Badge tone="red">Problem</Badge> {test.error}</p> : (
            <div style={{ marginTop: 12 }}>
              <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                <Badge tone={test.out.copy.tooClose ? 'red' : 'green'}>{test.out.copy.tooClose ? 'Close to the documents’ wording' : 'In its own words'}</Badge>
                <Badge>{test.out.confidence}% confident</Badge>
              </div>
              <div className="pre" style={{ whiteSpace: 'pre-wrap' }}>{test.out.draft}</div>
              {test.out.clarify?.questions?.length > 0 && <p className="muted small" style={{ marginTop: 6 }}>Asks the employee: {test.out.clarify.questions.join(' ')}</p>}
            </div>
          ))}
        </div>
      </details>

      {history.length > 0 && (
        <details className="plain">
          <summary>Earlier versions ({history.length})</summary>
          <div className="plain-body">
            {history.map((h, i) => (
              <div key={i} className="row between" style={{ marginBottom: 10, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <div className="small" style={{ flex: 1, minWidth: 0 }}><span className="muted">{fmtWhen(h.at)}</span><div style={{ whiteSpace: 'pre-wrap' }}>{h.text.slice(0, 160)}{h.text.length > 160 ? '…' : ''}</div></div>
                <button className="btn small" onClick={() => setText(h.text)}>Load</button>
              </div>
            ))}
          </div>
        </details>
      )}

      {showPrompt && (
        <Modal title="The full prompt the AI receives when writing" onClose={() => setShowPrompt(false)} wide>
          <p className="muted small" style={{ marginBottom: 8 }}>Your instructions come first, then the fixed rules. For each email the AI also gets the person's message and the facts found in your documents (never the documents themselves). Model: {s.ai?.model || DEFAULT_MODEL}.</p>
          <div className="pre" style={{ whiteSpace: 'pre-wrap' }}>{writerPromptPreview(draftSettings, s.tone)}</div>
          <div className="modal-actions"><button className="btn primary" onClick={() => setShowPrompt(false)}>Close</button></div>
        </Modal>
      )}
    </Card>
  )
}
