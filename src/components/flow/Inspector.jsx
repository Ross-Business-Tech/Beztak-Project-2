import { CATEGORIES, SEVERITIES } from '../../data/defaults'
import { BLOCKS, GROUPS, TICKET_STATUSES, titleOf } from '../../workflow/blocks'
import { Icon, Toggle } from '../ui'
import ConditionEditor from './ConditionEditor'

const Row = ({ title, hint, children }) => (
  <div className="insp-row"><div><strong>{title}</strong>{hint && <p className="muted small">{hint}</p>}</div>{children}</div>
)

function Rules({ config, set }) {
  const upd = (i, patch) => set({ rules: config.rules.map((r, k) => (k === i ? { ...r, ...patch } : r)) })
  return (
    <div>
      {config.rules.map((r, i) => (
        <div key={r.id} className="rule-card">
          <div className="field"><label>Rule name</label><input type="text" value={r.name} onChange={(e) => upd(i, { name: e.target.value })} /></div>
          <div className="field"><label>Describe it in plain words</label><p className="muted small">The AI uses this to recognise the situation even when the trigger words are missing.</p>
            <textarea rows={3} value={r.description} onChange={(e) => upd(i, { description: e.target.value })} /></div>
          <div className="field"><label>Trigger words and phrases</label><p className="muted small">One per line. A partial word like "harass" also catches harassed and harassment.</p>
            <textarea rows={4} defaultValue={r.keywords.map((k) => k.trim()).join('\n')} onBlur={(e) => upd(i, { keywords: e.target.value.split(/[\n,]/).map((k) => k.trim()).filter(Boolean) })} /></div>
          <div className="two-col">
            <div className="field"><label>Severity</label><select value={r.severity} onChange={(e) => upd(i, { severity: e.target.value })}>{SEVERITIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
            <div className="field"><label>Suggested owner</label><input type="text" value={r.notify} onChange={(e) => upd(i, { notify: e.target.value })} /></div>
          </div>
          <button className="btn small danger" disabled={config.rules.length < 2} onClick={() => set({ rules: config.rules.filter((_, k) => k !== i) })}>Remove this rule</button>
        </div>
      ))}
      <button className="btn small" onClick={() => set({ rules: [...config.rules, { id: `r_${Math.random().toString(36).slice(2, 7)}`, name: 'New rule', description: 'Describe the situation in plain words.', keywords: [], severity: 'high', notify: 'HR Business Partner' }] })}><Icon name="plus" size={14} /> Add a rule</button>
    </div>
  )
}

function Form({ kind, config, set }) {
  switch (kind) {
    case 'filter_flag': return (
      <>
        <Row title="Careful reply" hint="When this filter matches, the AI writes a short, warm, no-advice reply, and a person must confirm it before it is sent."><Toggle label="Careful reply" checked={config.careful} onChange={(v) => set({ careful: v })} /></Row>
        <Row title="Also check by meaning" hint="Uses the AI's reading of the message (needs an Understand with AI block earlier on)."><Toggle label="Check by meaning" checked={config.semantic} onChange={(v) => set({ semantic: v })} /></Row>
        <h3 style={{ margin: '16px 0 8px' }}>Rules in this filter</h3>
        <Rules config={config} set={set} />
      </>
    )
    case 'filter_text': return (
      <>
        <div className="field"><label>Where to look</label><select value={config.where} onChange={(e) => set({ where: e.target.value })}><option value="both">Subject and message</option><option value="subject">Subject only</option><option value="body">Message only</option><option value="sender">Sender address</option></select></div>
        <div className="field"><label>Words to look for</label><p className="muted small">One per line.</p><textarea rows={4} defaultValue={config.words.join('\n')} onBlur={(e) => set({ words: e.target.value.split(/[\n,]/).map((k) => k.trim()).filter(Boolean) })} /></div>
        <div className="field"><label>Match when</label><select value={config.mode} onChange={(e) => set({ mode: e.target.value })}><option value="any">Any word is found</option><option value="all">All words are found</option></select></div>
      </>
    )
    case 'if': return <ConditionEditor config={config} onChange={set} />
    case 'while': return (
      <>
        <ConditionEditor config={config} onChange={set} />
        <div className="field" style={{ marginTop: 12 }}><label>Maximum repeats</label><p className="muted small">The loop always stops after this many repeats, even if the condition is still true.</p>
          <input type="number" min={1} max={5} value={config.maxLoops} onChange={(e) => set({ maxLoops: Math.max(1, Math.min(5, Number(e.target.value) || 1)) })} /></div>
      </>
    )
    case 'switch_topic': return (
      <div className="field"><label>Topics that get their own path</label>
        <div className="check-list">{CATEGORIES.map((c) => (
          <label key={c.id}><input type="checkbox" checked={config.topics.includes(c.id)} onChange={(e) => set({ topics: e.target.checked ? [...config.topics, c.id] : config.topics.filter((x) => x !== c.id) })} />{c.label}</label>
        ))}</div></div>
    )
    case 'ai_draft': return (
      <div className="field"><label>Tone</label><select value={config.tone} onChange={(e) => set({ tone: e.target.value })}>
        <option value="default">Use the tone from Settings</option><option value="warm">Warm</option><option value="professional">Professional</option><option value="concise">Concise</option></select></div>
    )
    case 'alert': return (
      <>
        <div className="field"><label>Who to alert</label><input type="text" value={config.role} onChange={(e) => set({ role: e.target.value })} /></div>
        <div className="field"><label>Message</label><textarea rows={3} value={config.message} onChange={(e) => set({ message: e.target.value })} /></div>
      </>
    )
    case 'ticket_status': return (
      <div className="field"><label>Set the ticket to</label><p className="muted small">Pick a common status or type the exact status name used in Zoro.</p>
        <select value={TICKET_STATUSES.includes(config.status) ? config.status : '__custom'} onChange={(e) => set({ status: e.target.value === '__custom' ? '' : e.target.value })}>
          {TICKET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}<option value="__custom">Something else...</option></select>
        {!TICKET_STATUSES.includes(config.status) && <input type="text" style={{ marginTop: 8 }} value={config.status} placeholder="Exact Zoro status name" onChange={(e) => set({ status: e.target.value })} />}
      </div>
    )
    case 'ticket_tag': return (
      <>
        <Row title="Tag with the risks found" hint="Adds the name of every risk that was flagged, such as Harassment."><Toggle label="Tag with the risks found" checked={config.fromRisks} onChange={(v) => set({ fromRisks: v })} /></Row>
        <div className="field" style={{ marginTop: 12 }}><label>Other tags to always add</label><p className="muted small">One per line.</p>
          <textarea rows={3} defaultValue={config.tags.join('\n')} onBlur={(e) => set({ tags: e.target.value.split(/[\n,]/).map((t) => t.trim()).filter(Boolean) })} /></div>
      </>
    )
    case 'ticket_assign': return <div className="field"><label>Assign the ticket to</label><input type="text" value={config.assignee} onChange={(e) => set({ assignee: e.target.value })} /></div>
    case 'email_out': return <Row title="A person approves first" hint="On: the reply waits in the Review queue marked ready to send. Off: it is sent automatically."><Toggle label="Require approval" checked={config.requireApproval} onChange={(v) => set({ requireApproval: v })} /></Row>
    case 'review': return (
      <>
        <div className="field"><label>Priority</label><select value={config.priority} onChange={(e) => set({ priority: e.target.value })}><option value="normal">Normal</option><option value="urgent">Urgent</option></select></div>
        <Row title="Reviewer must confirm" hint="Adds a tick box that must be ticked before Send turns on."><Toggle label="Require confirmation" checked={config.requireConfirm} onChange={(v) => set({ requireConfirm: v })} /></Row>
      </>
    )
    case 'assign': return (
      <>
        <div className="field"><label>Suggested owner</label><input type="text" value={config.owner} onChange={(e) => set({ owner: e.target.value })} /></div>
        <div className="field"><label>Priority</label><select value={config.priority} onChange={(e) => set({ priority: e.target.value })}><option value="normal">Normal</option><option value="urgent">Urgent</option></select></div>
        <Row title="Reviewer must confirm" hint="Adds a tick box that must be ticked before Send turns on."><Toggle label="Require confirmation" checked={config.requireConfirm} onChange={(v) => set({ requireConfirm: v })} /></Row>
      </>
    )
    case 'close': return <div className="field"><label>Reason (for the record)</label><input type="text" value={config.reason} onChange={(e) => set({ reason: e.target.value })} /></div>
    default: return null
  }
}

export default function Inspector({ node, onChange, onDelete, onClose, connections = 0, onDisconnect }) {
  const def = BLOCKS[node.data.kind]
  const set = (patch) => onChange(node.id, { config: { ...node.data.config, ...patch } })
  return (
    <aside className="inspector" aria-label="Block settings">
      <div className="insp-head" style={{ background: GROUPS[def.group].color }}>
        <Icon name={def.icon} /><strong>{titleOf(node)}</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Close panel"><Icon name="close" /></button>
      </div>
      <div className="insp-body">
        <div className="insp-help"><strong>What this block does</strong><p>{def.help}</p></div>
        <div className="field"><label>Block name</label><input type="text" value={node.data.label} placeholder={def.title} onChange={(e) => onChange(node.id, { label: e.target.value })} /></div>
        <Form key={node.id} kind={node.data.kind} config={node.data.config} set={set} />
        <div className="insp-row"><div><strong>Connections</strong><p className="muted small">{connections === 0 ? 'Nothing is connected to this block yet.' : `${connections} connection${connections === 1 ? '' : 's'} attached. Double-click a line on the canvas to remove just one.`}</p></div>{connections > 0 && <button className="btn small" onClick={() => onDisconnect(node.id)}>Disconnect all</button>}</div>
        {!def.undeletable && <button className="btn danger" style={{ marginTop: 18 }} onClick={() => onDelete(node.id)}>Delete this block</button>}
      </div>
    </aside>
  )
}
