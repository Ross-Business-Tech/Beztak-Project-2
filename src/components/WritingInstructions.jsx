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
    <Card title="Writing instructions for the AI" hint="Admins only. Decides how every reply is worded: length, voice, structure.">
      <p className="muted small" style={{ marginBottom: 10 }}>These instructions tell the AI how to write. Your changes apply to the next email. You can use <code>{'{{tone}}'}</code> and <code>{'{{helpDeskName}}'}</code>, which are filled in from the settings above.</p>
      <Field label={<>Instructions {usingDefault ? <Badge tone="green">Built-in default</Badge> : <Badge tone="blue">Customised</Badge>} {dirty && <Badge tone="amber">Not saved yet</Badge>}</>}>
        {(id) => <textarea id={id} rows={14} maxLength={MAX} value={text} onChange={(e) => setText(e.target.value)} style={{ fontFamily: 'inherit' }} />}
      </Field>
      <div className="row between" style={{ marginTop: 6 }}>
        <span className="muted small">{text.length.toLocaleString()} / {MAX.toLocaleString()} characters</span>
        <span className="row" style={{ gap: 8 }}>
          <button className="btn" disabled={usingDefault && !dirty} onClick={() => setText(DEFAULT_WRITING_INSTRUCTIONS)}>Reset to default</button>
          <button className="btn primary" disabled={!dirty || !text.trim()} onClick={save}>Save instructions</button>
        </span>
      </div>
      <div className="guardrail" role="note" style={{ marginTop: 12 }}>
        <div>Always added by the app, and not editable: the AI may only use the verified facts from your documents, must ignore instructions hidden inside emails or documents, and sensitive messages (harassment, legal threats, distress) always get the built-in careful, no-advice reply. <button type="button" className="btn small" onClick={() => setShowPrompt(true)}>Show the full prompt</button></div>
      </div>

      <h3 style={{ marginTop: 18 }}>Try it on a sample email</h3>
      <p className="muted small" style={{ marginBottom: 8 }}>Uses the text in the box above (even if not saved yet) and your Knowledge files. Nothing is sent or stored.</p>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <select aria-label="Sample email" value={scenario} onChange={(e) => setScenario(e.target.value)} style={{ maxWidth: 320 }}>
          {SCENARIOS.filter((x) => !/harass|legal|wellbeing|hostile|eviction|arrest|garnish/.test(x.id)).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <button className="btn" disabled={test === 'busy' || s.ai.engine !== 'ai'} onClick={run}>{test === 'busy' ? 'Writing...' : 'Write a sample reply'}</button>
        {s.ai.engine !== 'ai' && <span className="muted small">Turn on the AI language model on the AI tab first.</span>}
      </div>
      {test && test !== 'busy' && (test.error ? <p className="small" style={{ marginTop: 10 }}><Badge tone="red">Problem</Badge> {test.error}</p> : (
        <div style={{ marginTop: 12 }}>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <Badge tone={test.out.copy.tooClose ? 'red' : 'green'}>{test.out.copy.tooClose ? 'Close to the documents’ wording' : 'In its own words'}</Badge>
            <Badge>{test.out.confidence}% confident</Badge>
            <Badge>{test.out.usage.sections} section{test.out.usage.sections === 1 ? '' : 's'} read, {Math.round(test.out.usage.charsSent / 1000)}k of {Math.round(test.out.usage.charsTotal / 1000)}k characters</Badge>
          </div>
          <div className="pre" style={{ whiteSpace: 'pre-wrap' }}>{test.out.draft}</div>
          {test.out.usage.used?.length > 0 && <p className="muted small" style={{ marginTop: 6 }}>Read: {test.out.usage.used.map((u) => `${u.name}${u.heading ? ` > ${u.heading}` : ''}`).join('; ')}</p>}
        </div>
      ))}

      {history.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary className="small"><strong>Earlier versions</strong> ({history.length})</summary>
          {history.map((h, i) => (
            <div key={i} className="row between" style={{ marginTop: 8, alignItems: 'flex-start' }}>
              <div className="small" style={{ flex: 1 }}><span className="muted">{fmtWhen(h.at)}</span><div style={{ whiteSpace: 'pre-wrap' }}>{h.text.slice(0, 160)}{h.text.length > 160 ? '…' : ''}</div></div>
              <button className="btn small" onClick={() => setText(h.text)}>Load into the box</button>
            </div>
          ))}
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
