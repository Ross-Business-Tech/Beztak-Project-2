import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { DEFAULT_HANDOFF, DEPTHS } from '../engine/ai'
import { fmtUsd, priceFor } from '../engine/cost'
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

/** The optional cheaper model for the reading steps. Sits beside the main Model box. */
export function ReadingModelField({ s, set }) {
  return (
    <Field label="Reading model (optional)" hint="A smaller, cheaper model for reading. The model on the left only writes the reply.">
      {(id) => <input id={id} type="text" value={s.ai.readModel || ''} onChange={(e) => set({ ai: { ...s.ai, readModel: e.target.value } })} placeholder="Same as Model, e.g. claude-haiku-5-5" />}
    </Field>
  )
}

const DEPTH_NOTE = {
  light: 'Reads the 4 best-matching sections of a long document. Fastest and cheapest.',
  standard: 'Reads the 6 best-matching sections of a long document. A good balance.',
  deep: 'Reads the 8 best-matching sections of a long document. Slower, for answers spread across many places.',
}

/** How much of the documents the AI reads, and the prices behind the cost estimates. */
export function ReadingDepthAndPrices({ s, set }) {
  const ai = s.ai
  const patch = (p, note) => set({ ai: { ...ai, ...p } }, note)
  const read = (ai.readModel || '').trim()
  const depth = ai.readDepth || 'standard'
  return (
    <>
      <Field label="How much of your documents the AI reads" hint={DEPTH_NOTE[depth]}>
        {() => <Segmented label="Reading depth" value={depth} onChange={(v) => patch({ readDepth: v }, `Reading depth set to ${DEPTHS[v].label}`)}
          options={Object.entries(DEPTHS).map(([value, d]) => ({ value, label: d.label }))} />}
      </Field>
      <details className="plain">
        <summary>Prices used for cost estimates</summary>
        <div className="plain-body">
          <p className="muted small" style={{ marginBottom: 10 }}>Claude and OpenAI list prices are built in. For any other model, or if your price differs, enter it per million tokens (US dollars).</p>
          <PriceLine model={ai.model} ai={ai} inKey="priceIn" outKey="priceOut" set={patch} />
          {read && read !== (ai.model || '').trim() && <PriceLine model={read} ai={ai} inKey="readPriceIn" outKey="readPriceOut" set={patch} />}
        </div>
      </details>
    </>
  )
}

function PriceLine({ model, ai, inKey, outKey, set }) {
  const p = priceFor(model, ai)
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="small"><strong>{model || '(no model)'}</strong>{' '}
        {p ? <span className="muted">{p.source === 'settings' ? 'your price' : 'built-in'}: ${p.in} in / ${p.out} out</span> : <Badge tone="amber">No price on file</Badge>}
      </div>
      <div className="row" style={{ gap: 12, marginTop: 6 }}>
        <label className="small">Input <NumberBox width={90} label={`Input price per million tokens for ${model}`} value={ai[inKey]} placeholder="auto" onCommit={(v) => set({ [inKey]: v })} /></label>
        <label className="small">Output <NumberBox width={90} label={`Output price per million tokens for ${model}`} value={ai[outKey]} placeholder="auto" onCommit={(v) => set({ [outKey]: v })} /></label>
      </div>
    </div>
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
  const setLim = (patch) => updateSettings({ aiLimits: { ...lim, ...patch } })
  const pct = usage && lim.dailyUsd > 0 ? Math.min(100, Math.round((usage.usd / lim.dailyUsd) * 100)) : 0
  return (
    <Card title="Cost limits" hint="Guards against a surprise bill. Amounts are estimates from text length and list prices.">
      <div className="stat-row" style={{ marginBottom: 14 }}>
        <div className="stat"><div className="v">{usage ? fmtUsd(usage.usd) : '—'}</div><div className="k">spent today (resets at midnight UTC)</div></div>
        <div className="stat"><div className="v">{usage ? usage.calls.toLocaleString() : '—'}</div><div className="k">AI calls today</div></div>
        {usage?.unpriced > 0 && <div className="stat"><div className="v">{usage.unpriced}</div><div className="k">calls with no price on file</div></div>}
      </div>
      {lim.dailyUsd > 0 && usage && <div className={`limit-bar ${pct > 85 ? 'hot' : ''}`} aria-hidden="true" style={{ marginBottom: 14 }}><span style={{ width: `${pct}%` }} /></div>}
      <div className="two-col">
        <Field label="Daily spending limit ($)" hint="Pauses the AI until tomorrow when reached. 0 = no limit.">
          {() => <NumberBox empty={0} width={130} label="Daily spending limit" placeholder="0" value={lim.dailyUsd} onCommit={(v) => setLim({ dailyUsd: v })} />}
        </Field>
        <Field label="Limit per import ($)" hint="Blocks an import estimated above this. 0 = no limit.">
          {() => <NumberBox empty={0} width={130} label="Limit per import" placeholder="0" value={lim.importRunUsd} onCommit={(v) => setLim({ importRunUsd: v })} />}
        </Field>
      </div>
    </Card>
  )
}

/** What happens when the documents have nothing on a question. */
export function HandoffCard() {
  const { settings: s, updateSettings } = useApp()
  const on = s.skipAIWhenNoMatch !== false
  const text = s.handoffText || ''
  return (
    <Card title="When the documents have no answer">
      <SettingRow title="Use a fixed hand-off reply" hint="If nothing in the documents answers the question, skip the AI and use the wording below. A person still reviews it, and it saves AI cost.">
        <Toggle label="Use a fixed hand-off reply when no document matches" checked={on} onChange={(v) => updateSettings({ skipAIWhenNoMatch: v }, `Fixed hand-off reply turned ${v ? 'on' : 'off'}`)} />
      </SettingRow>
      {on && (
        <>
          <Field label="Hand-off reply" hint="You can use {{firstName}} and {{helpDeskName}}. The signature and footer are added after.">
            {(id) => <textarea id={id} rows={4} value={text || DEFAULT_HANDOFF} onChange={(e) => updateSettings({ handoffText: e.target.value === DEFAULT_HANDOFF ? '' : e.target.value })} maxLength={600} />}
          </Field>
          {text && <button className="btn small" onClick={() => updateSettings({ handoffText: '' }, 'Hand-off reply reset to the built-in wording')}>Reset to built-in wording</button>}
        </>
      )}
    </Card>
  )
}
