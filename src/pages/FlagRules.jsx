import { useState } from 'react'
import { useApp, uid } from '../store'
import { SEVERITIES } from '../data/defaults'
import { checkFlags } from '../engine/mockAI'
import { Badge, Card, Field, Modal, PageHeader, Segmented, SeverityBadge, Toggle } from '../components/ui'

const ACTIONS = { escalate: 'Escalate: no AI reply', hold: 'Hold: AI drafts, a person reviews' }
const NEW = { id: '', name: '', description: '', severity: 'high', action: 'hold', enabled: true, keywords: [], notify: 'HR Business Partner' }

export default function FlagRules() {
  const { rules, saveRule, deleteRule, log, toast } = useApp()
  const [edit, setEdit] = useState(null)
  const [probe, setProbe] = useState('')
  const hits = probe.trim() ? checkFlags(probe, rules) : []

  return (
    <>
      <PageHeader title="Flag rules" subtitle='Choose what counts as "needs human review". Flagged messages are never sent automatically.'>
        <button className="btn primary" onClick={() => setEdit({ ...NEW })}>＋ New rule</button>
      </PageHeader>

      <Card title="Try a message" hint="Paste a sentence to see which rules would catch it.">
        <textarea rows={3} aria-label="Message to test" value={probe} onChange={(e) => setProbe(e.target.value)} placeholder="e.g. My manager keeps making comments that feel like harassment…" />
        {probe.trim() && (
          <div style={{ marginTop: 10 }}>
            {hits.length === 0 ? <Badge tone="green">No rules triggered</Badge> : hits.map((h) => (
              <div key={h.ruleId} className="row" style={{ marginBottom: 6 }}>
                <SeverityBadge severity={h.severity} /><strong>{h.name}</strong><span className="muted small">{ACTIONS[h.action]}</span>
                {h.matched.map((m) => <span key={m} className="chip hit">{m}</span>)}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ marginTop: 16 }}>
        {rules.map((r) => (
          <div key={r.id} className={`rule ${r.enabled ? '' : 'off'}`}>
            <div className="rule-top">
              <div style={{ minWidth: 0 }}>
                <div className="row"><strong>{r.name}</strong><SeverityBadge severity={r.severity} /><Badge tone={r.action === 'escalate' ? 'red' : 'amber'}>{r.action === 'escalate' ? 'Escalate' : 'Hold for review'}</Badge></div>
                <p className="muted small" style={{ margin: '4px 0 8px' }}>{r.description}</p>
                <div>{r.keywords.slice(0, 8).map((k) => <span key={k} className="chip">{k.trim()}</span>)}{r.keywords.length > 8 && <span className="muted small"> +{r.keywords.length - 8} more</span>}</div>
                <p className="muted small" style={{ marginTop: 6 }}>Notifies: {r.notify}</p>
              </div>
              <div className="row" style={{ flex: 'none', flexWrap: 'nowrap' }}>
                <button className="btn small" onClick={() => setEdit({ ...r })}>Edit</button>
                <Toggle label={`Rule ${r.name} on`} checked={r.enabled} onChange={(v) => { saveRule({ ...r, enabled: v }); log('rules', `Flag rule "${r.name}" turned ${v ? 'on' : 'off'}`) }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="guardrail" role="note"><span aria-hidden>🔒</span><div><strong>Built-in safety guardrail:</strong> any message that triggers a rule is held for a person, regardless of your reply mode or confidence.</div></div>

      {edit && <RuleModal rule={edit} onClose={() => setEdit(null)}
        onSave={(r) => { const isNew = !r.id; saveRule({ ...r, id: r.id || uid('rule') }); log('rules', `Flag rule "${r.name}" ${isNew ? 'created' : 'updated'}`); toast('Rule saved'); setEdit(null) }}
        onDelete={(r) => { deleteRule(r.id); log('rules', `Flag rule "${r.name}" deleted`); toast('Rule deleted'); setEdit(null) }} />}
    </>
  )
}

function RuleModal({ rule, onClose, onSave, onDelete }) {
  const [r, setR] = useState({ ...rule, keywordText: rule.keywords.map((k) => k.trim()).join('\n') })
  const set = (k, v) => setR((x) => ({ ...x, [k]: v }))
  const keywords = r.keywordText.split(/[\n,]/).map((k) => k.trim()).filter(Boolean)
  const valid = r.name.trim() && keywords.length > 0
  return (
    <Modal title={rule.id ? 'Edit rule' : 'New flag rule'} onClose={onClose} wide>
      <Field label="Name">{(id) => <input id={id} type="text" value={r.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Salary negotiation" />}</Field>
      <Field label="What is it for?">{(id) => <input id={id} type="text" value={r.description} onChange={(e) => set('description', e.target.value)} />}</Field>
      <Field label="Trigger words and phrases" hint="One per line. A word ending in a partial stem like 'harass' also catches harassed and harassment.">
        {(id) => <textarea id={id} rows={6} value={r.keywordText} onChange={(e) => set('keywordText', e.target.value)} />}
      </Field>
      <div className="two-col">
        <Field label="Severity">{(id) => <select id={id} value={r.severity} onChange={(e) => set('severity', e.target.value)}>{SEVERITIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>}</Field>
        <Field label="Notify (role or team)">{(id) => <input id={id} type="text" value={r.notify} onChange={(e) => set('notify', e.target.value)} />}</Field>
      </div>
      <Field label="When triggered">
        {() => <Segmented label="Action" value={r.action} onChange={(v) => set('action', v)} options={[{ value: 'hold', label: 'Hold for review' }, { value: 'escalate', label: 'Escalate (no AI reply)' }]} />}
      </Field>
      <p className="muted small">{r.action === 'hold' ? 'The AI still writes a draft, but a person must approve it.' : 'The AI writes nothing. A person must respond. Best for sensitive topics.'}</p>
      <div className="modal-actions">
        {rule.id && <button className="btn danger" style={{ marginRight: 'auto' }} onClick={() => confirm(`Delete "${rule.name}"?`) && onDelete(rule)}>Delete</button>}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!valid} onClick={() => onSave({ ...r, name: r.name.trim(), keywords, keywordText: undefined })}>Save rule</button>
      </div>
    </Modal>
  )
}
