import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { DEPTHS } from '../engine/ai'
import { fmtUsd, priceFor } from '../engine/cost'
import { DEFAULT_HANDOFF } from '../engine/ai'
import { Badge, Card, Field, Segmented, SettingRow, Toggle } from './ui'

/**
 * A number box that lets you type freely ("0.", an empty box, "05") and saves only when what you typed is a valid number.
 * `empty` is what an empty box means: '' (not set) for prices, 0 (no limit) for limits.
 */
function NumberBox({ value, onCommit, empty = '', width = 100, label, placeholder }) {
  const show = (v) => (v === '' || v === null || v === undefined || (empty === 0 && Number(v) === 0) ? '' : String(v))
  const [text, setText] = useState(show(value))
  const editing = useRef(false)
  // Follow changes made elsewhere (a preset loaded, another admin), but never while this box is being typed in.
  useEffect(() => { if (!editing.current) setText(show(value)) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <input type="text" inputMode="decimal" style={{ width }} aria-label={label} placeholder={placeholder} value={text}
      onFocus={() => { editing.current = true }}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.]/g, '')
        setText(t)
        if (t === '') onCommit(empty)
        else if (/^\d*\.?\d*$/.test(t) && t !== '.') onCommit(Math.max(0, Number(t)))
      }}
      onBlur={() => { editing.current = false; setText(show(value)) }} />
  )
}

function PriceLine({ model, ai, inKey, outKey, set }) {
  const p = priceFor(model, ai)
  return (
    <div className="small" style={{ margin: '4px 0 10px' }}>
      <strong>{model || '(no model)'}</strong>{' '}
      {p ? <span className="muted">{p.source === 'settings' ? 'your price' : 'built-in price'}: ${p.in} in / ${p.out} out per million tokens</span> : <Badge tone="amber">No price on file</Badge>}
      <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
        <label className="small">Your input price <NumberBox width={90} label={`Input price per million tokens for ${model}`} value={ai[inKey]} placeholder="auto" onCommit={(v) => set({ [inKey]: v })} /></label>
        <label className="small">Your output price <NumberBox width={90} label={`Output price per million tokens for ${model}`} value={ai[outKey]} placeholder="auto" onCommit={(v) => set({ [outKey]: v })} /></label>
        <span className="muted small">US dollars per million tokens. Leave blank to use the built-in price.</span>
      </div>
    </div>
  )
}

/** Extra AI settings: a cheaper model for reading, how much of the documents to read, and prices. Shown inside the AI engine card. */
export function ReadingSettings({ s, set }) {
  const ai = s.ai
  const patch = (p, note) => set({ ai: { ...ai, ...p } }, note)
  const read = (ai.readModel || '').trim()
  return (
    <>
      <Field label="Reading model (optional)" hint="A smaller, faster, cheaper model for the reading steps: working out the topic and risks, and finding facts in your documents. The model above only writes the reply. Leave empty to use one model for everything.">
        {(id) => <input id={id} type="text" value={ai.readModel || ''} onChange={(e) => patch({ readModel: e.target.value })} placeholder="Same as the model above, for example claude-haiku-5-5" />}
      </Field>
      <Field label="How much of your documents the AI reads" hint="Light reads the 4 best-matching sections of a long document, Standard 5, Deep 8 (short documents are cut back in the same proportion). Less is faster and cheaper; more helps when answers are scattered across many documents.">
        {() => <Segmented label="Reading depth" value={ai.readDepth || 'standard'} onChange={(v) => patch({ readDepth: v }, `Reading depth set to ${DEPTHS[v].label}`)}
          options={Object.entries(DEPTHS).map(([value, d]) => ({ value, label: d.label }))} />}
      </Field>
      <details style={{ margin: '4px 0 12px' }}>
        <summary className="small"><strong>Prices used for cost estimates</strong></summary>
        <p className="muted small" style={{ margin: '6px 0' }}>Used for the Import cost estimate and the daily limit. The app knows Claude prices; for any other model, enter the price from its provider.</p>
        <PriceLine model={ai.model} ai={ai} inKey="priceIn" outKey="priceOut" set={(p) => patch(p)} />
        {read && read !== (ai.model || '').trim() && <PriceLine model={read} ai={ai} inKey="readPriceIn" outKey="readPriceOut" set={(p) => patch(p)} />}
      </details>
    </>
  )
}

/** Today's AI use and the two spending limits. */
export function CostsAndLimits() {
  const { settings: s, updateSettings, aiUsage } = useApp()
  const [usage, setUsage] = useState(null)
  useEffect(() => {
    let alive = true
    Promise.resolve(aiUsage?.()).then((u) => { if (alive) setUsage(u || null) }).catch(() => {})
    return () => { alive = false }
  }, [aiUsage, s.aiLimits?.dailyUsd])
  const lim = s.aiLimits || { dailyUsd: 0, importRunUsd: 0 }
  const setLim = (patch, note) => updateSettings({ aiLimits: { ...lim, ...patch } }, note)
  const pct = usage && lim.dailyUsd > 0 ? Math.min(100, Math.round((usage.usd / lim.dailyUsd) * 100)) : 0
  return (
    <Card title="Cost limits" hint="Guards against a surprise bill. Amounts are estimates from text length and list prices.">
      <SettingRow title="Today's AI use" hint="Resets at midnight UTC. Counts every AI call the app makes, including the test buttons.">
        <span className="small">{usage ? <><strong>{fmtUsd(usage.usd)}</strong> · {usage.calls.toLocaleString()} calls{usage.unpriced > 0 ? <> · <Badge tone="amber">{usage.unpriced} calls had no price on file</Badge></> : null}</> : 'Not available yet'}</span>
      </SettingRow>
      <Field label="Daily spending limit (US dollars)" hint="When today's estimated spend reaches this, the AI pauses until tomorrow and new messages go to a person using the simple word-matching writer. Leave 0 for no limit.">
        {() => <NumberBox empty={0} width={120} label="Daily spending limit" placeholder="0 = no limit" value={lim.dailyUsd} onCommit={(v) => setLim({ dailyUsd: v })} />}
      </Field>
      {lim.dailyUsd > 0 && usage && <div className="meter" aria-hidden="true" style={{ height: 8, background: 'var(--line, #ddd)', borderRadius: 4, overflow: 'hidden', margin: '-4px 0 12px' }}><div style={{ width: `${pct}%`, height: '100%', background: pct > 85 ? 'var(--red, #c0392b)' : 'var(--blue, #2563eb)' }} /></div>}
      <Field label="Limit per import (US dollars)" hint="Import and evaluate shows its estimated cost first, and will not start a run estimated above this. Leave 0 for no limit.">
        {() => <NumberBox empty={0} width={120} label="Limit per import" placeholder="0 = no limit" value={lim.importRunUsd} onCommit={(v) => setLim({ importRunUsd: v })} />}
      </Field>
    </Card>
  )
}

/** What happens when the documents have nothing on a question. */
export function HandoffCard() {
  const { settings: s, updateSettings } = useApp()
  const on = s.skipAIWhenNoMatch !== false
  const text = s.handoffText || ''
  return (
    <Card title="When the documents have no answer" hint="Saves AI cost: the AI is not asked to write a reply it has nothing to base on.">
      <SettingRow title="Skip the AI and send the hand-off reply" hint="If no document matches the question, or the AI finds nothing usable in the matching ones, the wording below is used. It still goes through your Workflow, so a person reviews it.">
        <Toggle label="Skip the AI when no document matches" checked={on} onChange={(v) => updateSettings({ skipAIWhenNoMatch: v }, `Skipping the AI when no document matches turned ${v ? 'on' : 'off'}`)} />
      </SettingRow>
      {on && (
        <Field label="Hand-off reply" hint="You can use {{firstName}} and {{helpDeskName}}. The signature and footer are added afterwards. Leave empty to use the built-in wording.">
          {(id) => <textarea id={id} rows={5} value={text || DEFAULT_HANDOFF} onChange={(e) => updateSettings({ handoffText: e.target.value === DEFAULT_HANDOFF ? '' : e.target.value })} maxLength={600} />}
        </Field>
      )}
      {on && text && <button className="btn small" onClick={() => updateSettings({ handoffText: '' }, 'Hand-off reply reset to the built-in wording')}>Reset to built-in wording</button>}
    </Card>
  )
}
