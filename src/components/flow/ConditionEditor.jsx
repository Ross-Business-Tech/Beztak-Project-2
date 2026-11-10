import { CATEGORIES } from '../../data/defaults'
import { FIELDS, OPS, RISK_LEVELS, defaultValue, newCondition } from '../../workflow/blocks'
import { Icon } from '../ui'

function ValueInput({ cond, onChange }) {
  const f = FIELDS[cond.field]
  if (f.type === 'number') return <input type="number" aria-label="Value" value={cond.value} onChange={(e) => onChange({ ...cond, value: e.target.value === '' ? '' : Number(e.target.value) })} />
  if (f.type === 'text') return <input type="text" aria-label="Value" value={cond.value} onChange={(e) => onChange({ ...cond, value: e.target.value })} placeholder="text to look for" />
  if (f.type === 'yesno') return <select aria-label="Value" value={cond.value} onChange={(e) => onChange({ ...cond, value: e.target.value })}><option value="yes">Yes</option><option value="no">No</option></select>
  if (f.type === 'risk') return <select aria-label="Value" value={cond.value} onChange={(e) => onChange({ ...cond, value: e.target.value })}>{RISK_LEVELS.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}</select>
  if (cond.op === 'in') {
    const sel = Array.isArray(cond.value) ? cond.value : [cond.value]
    return (
      <div className="check-list">
        {CATEGORIES.map((c) => (
          <label key={c.id}><input type="checkbox" checked={sel.includes(c.id)} onChange={(e) => onChange({ ...cond, value: e.target.checked ? [...sel, c.id] : sel.filter((x) => x !== c.id) })} />{c.label}</label>
        ))}
      </div>
    )
  }
  return <select aria-label="Value" value={Array.isArray(cond.value) ? cond.value[0] : cond.value} onChange={(e) => onChange({ ...cond, value: e.target.value })}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
}

/** Edit the list of conditions for an If or While block. */
export default function ConditionEditor({ config, onChange }) {
  const set = (i, c) => onChange({ ...config, conditions: config.conditions.map((x, k) => (k === i ? c : x)) })
  return (
    <div>
      {config.conditions.length > 1 && (
        <div className="field"><label>Combine the conditions</label>
          <select value={config.join} onChange={(e) => onChange({ ...config, join: e.target.value })}>
            <option value="all">All must be true (AND)</option><option value="any">Any one is enough (OR)</option>
          </select>
        </div>
      )}
      {config.conditions.map((c, i) => (
        <div key={i} className="cond">
          <select aria-label="What to check" value={c.field} onChange={(e) => { const field = e.target.value; const t = FIELDS[field].type; set(i, { field, op: OPS[t][0][0], value: defaultValue(field) }) }}>
            {Object.entries(FIELDS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
          </select>
          <select aria-label="Comparison" value={c.op} onChange={(e) => set(i, { ...c, op: e.target.value, value: e.target.value === 'in' ? (Array.isArray(c.value) ? c.value : [c.value]) : (Array.isArray(c.value) ? c.value[0] : c.value) })}>
            {OPS[FIELDS[c.field].type].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <ValueInput cond={c} onChange={(x) => set(i, x)} />
          <p className="muted small">{FIELDS[c.field].help}</p>
          {config.conditions.length > 1 && <button className="btn small danger" onClick={() => onChange({ ...config, conditions: config.conditions.filter((_, k) => k !== i) })}>Remove this condition</button>}
        </div>
      ))}
      <button className="btn small" onClick={() => onChange({ ...config, conditions: [...config.conditions, newCondition()] })}><Icon name="plus" size={14} /> Add a condition</button>
    </div>
  )
}
