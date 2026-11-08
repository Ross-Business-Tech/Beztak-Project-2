import { useState } from 'react'
import { useApp } from '../store'
import { CATEGORIES } from '../data/defaults'
import { Badge, Card, HelpPanel, Icon, Field, Modal, PageHeader, Segmented, SettingRow, Toggle } from '../components/ui'

const MODES = [
  { id: 'draft', title: 'Draft for review', text: 'The AI writes a reply. A person approves every one before it goes out. Safest.' },
  { id: 'auto_safe', title: 'Auto-send when safe', text: 'Sends on its own only for allowed topics when the AI is confident. Everything else waits for review.' },
  { id: 'auto_all', title: 'Auto-send everything safe', text: 'Sends every unflagged reply that has a supporting document. Flagged messages still wait for a person.' },
]

export default function Settings() {
  const { settings: s, updateSettings, log, toast, resetAll, storageFull } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)
  const set = (patch, note) => updateSettings(patch, note)
  const nested = (key, patch, note) => set({ [key]: { ...s[key], ...patch } }, note)
  const zoro = s.integrations.zoro

  return (
    <>
      <PageHeader title="Settings" subtitle="Changes save automatically and apply to the next email." />
      <HelpPanel id="settings" steps={[
        'Start with "How should replies go out?" This is the most important decision: whether a person approves every reply, or the system sends low-risk ones itself.',
        'Under Auto-send rules, set the confidence needed, the topics allowed to send automatically, and limits that prevent loops.',
        'Reply style controls tone, signature and the AI disclosure footer on every message.',
        'Escalations covers the optional instant acknowledgement for sensitive messages. Staff are alerted inside this tool, in the Review queue.',
        'Connection to Zoro (your ticketing system) is a placeholder for now. Reporting sets how time saved is estimated.',
      ]} note="Changes save automatically and apply to the next email processed." />
      {storageFull && <div className="sim-banner" role="alert">This browser is out of storage, so recent changes may not be saved. Delete some large files in Knowledge files.</div>}

      <Card title="How should replies go out?">
        <div className="mode-cards" role="radiogroup" aria-label="Reply mode">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={s.mode === m.id} className={`mode-card ${s.mode === m.id ? 'on' : ''}`}
              onClick={() => { set({ mode: m.id }, `Reply mode changed to "${m.title}"`); toast(`Mode: ${m.title}`) }}>
              <strong>{m.title}</strong><span className="muted small">{m.text}</span>
            </button>
          ))}
        </div>
        <div className="guardrail" role="note"><Icon name="lock" /><div>Messages that trigger a <a href="#/admin/flags">flag rule</a> (like harassment) are never sent automatically in any mode.</div></div>
      </Card>

      <Card title="Auto-send rules" hint={s.mode === 'draft' ? 'Not used while in "Draft for review" mode, but ready for when you switch.' : 'Applied when the AI wants to send on its own.'}>
        {s.mode === 'auto_safe' || s.mode === 'draft' ? (
          <>
            <SettingRow title={`Minimum confidence: ${s.confidenceThreshold}%`} hint="Below this, the draft waits for review.">
              <input type="range" min={40} max={99} value={s.confidenceThreshold} aria-label="Minimum confidence" onChange={(e) => set({ confidenceThreshold: Number(e.target.value) })} style={{ width: 220, maxWidth: '100%' }} />
            </SettingRow>
            <SettingRow title="Topics allowed to auto-send" hint="Turn off topics that should always be reviewed, like payroll.">
              <div style={{ display: 'grid', gap: 8, minWidth: 250 }}>
                {CATEGORIES.map((c) => (
                  <div key={c.id} className="row between"><span>{c.label}</span>
                    <Toggle label={`Auto-send ${c.label}`} checked={!!s.autoCategories[c.id]} onChange={(v) => set({ autoCategories: { ...s.autoCategories, [c.id]: v } }, `Auto-send for "${c.label}" turned ${v ? 'on' : 'off'}`)} /></div>
                ))}
              </div>
            </SettingRow>
          </>
        ) : <p className="muted small" style={{ marginBottom: 6 }}>Topic and confidence limits are ignored in "Auto-send everything safe".</p>}
        <SettingRow title="Only answer from documents" hint="If no document supports an answer, never auto-send." >
          <div className="switch"><Toggle label="Require a source" checked={s.requireSource} onChange={(v) => set({ requireSource: v }, `"Only answer from documents" turned ${v ? 'on' : 'off'}`)} /></div>
        </SettingRow>
        <SettingRow title="Max automatic replies per sender per day" hint="Stops loops and back-and-forth.">
          <input type="number" min={1} max={20} value={s.maxAutoPerSenderPerDay} aria-label="Max replies" style={{ width: 90 }} onChange={(e) => set({ maxAutoPerSenderPerDay: Math.max(1, Number(e.target.value) || 1) })} />
        </SettingRow>
        <SettingRow title="Business hours" hint="Optionally hold automatic replies sent outside working hours.">
          <div className="row">
            <Toggle label="Use business hours" checked={s.hours.enabled} onChange={(v) => nested('hours', { enabled: v })} />
            {s.hours.enabled && <>
              <input type="time" aria-label="Start" style={{ width: 120 }} value={s.hours.start} onChange={(e) => nested('hours', { start: e.target.value })} />
              <span>to</span>
              <input type="time" aria-label="End" style={{ width: 120 }} value={s.hours.end} onChange={(e) => nested('hours', { end: e.target.value })} />
            </>}
          </div>
        </SettingRow>
      </Card>

      <Card title="Reply style">
        <div className="two-col">
          <Field label="Help desk name">{(id) => <input id={id} type="text" value={s.helpDeskName} onChange={(e) => set({ helpDeskName: e.target.value })} />}</Field>
          <Field label="Reply-from address (example only)">{(id) => <input id={id} type="email" value={s.replyToAddress} onChange={(e) => set({ replyToAddress: e.target.value })} />}</Field>
        </div>
        <Field label="Tone">{() => <Segmented label="Tone" value={s.tone} onChange={(v) => set({ tone: v })} options={[{ value: 'warm', label: 'Warm' }, { value: 'professional', label: 'Professional' }, { value: 'concise', label: 'Concise' }]} />}</Field>
        <Field label="Signature">{(id) => <textarea id={id} rows={3} value={s.signature} onChange={(e) => set({ signature: e.target.value })} />}</Field>
        <SettingRow title="Add an AI disclosure footer" hint="Tells people an AI helped write the reply.">
          <Toggle label="Footer" checked={s.includeFooter} onChange={(v) => set({ includeFooter: v })} />
        </SettingRow>
        {s.includeFooter && <Field label="Footer text">{(id) => <textarea id={id} rows={2} value={s.footer} onChange={(e) => set({ footer: e.target.value })} />}</Field>}
      </Card>

      <Card title="Escalations" hint="High-risk rules always produce a draft that a person must edit and confirm before it is sent.">
        <SettingRow title="Also send a short acknowledgement right away" hint="On top of the draft a person reviews, instantly tells the employee someone will be in touch. Contains no advice.">
          <Toggle label="Acknowledge" checked={s.ackOnEscalate} onChange={(v) => set({ ackOnEscalate: v }, `Escalation acknowledgement turned ${v ? 'on' : 'off'}`)} />
        </SettingRow>
        {s.ackOnEscalate && <Field label="Acknowledgement text">{(id) => <textarea id={id} rows={3} value={s.ackText} onChange={(e) => set({ ackText: e.target.value })} />}</Field>}
      </Card>

      <Card title="Connection to Zoro" hint="Planned, not working yet. These switches only change how the test environment behaves.">
        <SettingRow title={<>Zoro ticketing <Badge tone="amber">Coming soon</Badge></>} hint="Zoro is where tickets arrive and where replies are sent. The AI does not look up employee records.">
          <Toggle label="Zoro" checked={zoro.enabled} onChange={(v) => nested('integrations', { zoro: { ...zoro, enabled: v } }, `Zoro connection turned ${v ? 'on (simulated)' : 'off'}`)} />
        </SettingRow>
        {zoro.enabled && (
          <div style={{ paddingBottom: 8 }}>
            <Field label="Zoro MCP server address" hint="Placeholder. Nothing is called.">{(id) => <input id={id} type="text" value={zoro.serverUrl} onChange={(e) => nested('integrations', { zoro: { ...zoro, serverUrl: e.target.value } })} placeholder="https://..." />}</Field>
            <SettingRow title="Pull new tickets automatically" hint="New tickets in Zoro appear in the review queue."><Toggle label="Pull tickets" checked={zoro.pullTickets} onChange={(v) => nested('integrations', { zoro: { ...zoro, pullTickets: v } })} /></SettingRow>
            <SettingRow title="Send replies back to the ticket" hint="When a reply is approved, or auto-sent, post it to the ticket in Zoro."><Toggle label="Send replies" checked={zoro.sendReplies} onChange={(v) => nested('integrations', { zoro: { ...zoro, sendReplies: v } })} /></SettingRow>
            <SettingRow title="When a draft is waiting for review" hint="Optionally also save it inside the Zoro ticket as an internal draft note.">
              <select aria-label="Draft handling" value={zoro.replyAs} onChange={(e) => nested('integrations', { zoro: { ...zoro, replyAs: e.target.value } })}>
                <option value="draft_note">Add as an internal draft note</option><option value="none">Keep only in this tool</option>
              </select>
            </SettingRow>
          </div>
        )}
      </Card>

      <Card title="Reporting" hint="Used for the leadership figures on the Dashboard.">
        <SettingRow title="Minutes saved per reply" hint="How long one reply takes a person today. Used to estimate time saved.">
          <input type="number" min={1} max={60} value={s.minutesSavedPerReply} aria-label="Minutes per reply" style={{ width: 90 }} onChange={(e) => set({ minutesSavedPerReply: Math.max(1, Number(e.target.value) || 1) })} />
        </SettingRow>
      </Card>

      <Card title="Test data">
        <SettingRow title="Reset test data" hint="Brings back the sample emails, documents, rules and settings. Your test emails and uploads are removed."><button className="btn danger" onClick={() => setConfirmReset(true)}>Reset everything</button></SettingRow>
      </Card>

      {confirmReset && (
        <Modal title="Reset all test data?" onClose={() => setConfirmReset(false)}>
          <p>This deletes your test emails, uploaded files, custom rules and settings changes in this browser.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button className="btn primary" style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }} onClick={() => { resetAll(); setConfirmReset(false); toast('Test data reset'); log('system', 'Test data reset') }}>Reset</button>
          </div>
        </Modal>
      )}
    </>
  )
}
