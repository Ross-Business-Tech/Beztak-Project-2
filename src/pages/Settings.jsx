import { useState } from 'react'
import { useApp } from '../store'
import { DEFAULT_MODEL, testConnection } from '../engine/ai'
import { Badge, Card, HelpPanel, Icon, Field, Modal, PageHeader, Segmented, SettingRow, Toggle } from '../components/ui'

export default function Settings() {
  const { settings: s, updateSettings, log, toast, resetAll, storageFull } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)
  const [check, setCheck] = useState(null)
  const set = (patch, note) => updateSettings(patch, note)
  const nested = (key, patch, note) => set({ [key]: { ...s[key], ...patch } }, note)
  const zoro = s.integrations.zoro

  return (
    <>
      <PageHeader title="Settings" subtitle="Changes save automatically and apply to the next email." />
      <HelpPanel id="settings" steps={[
        'AI engine chooses whether a real AI model or the simple word-matching stand-in reads each message. Use Check the AI connection to confirm it is working.',
        'Reply style controls the tone, signature and AI disclosure footer on every message the AI writes.',
        'Connection to Zoro (your ticketing system) is a placeholder for now. Reporting sets how time saved is estimated.',
        'Routing rules, flagging and automatic sending are in the Workflow, not here.',
      ]} note="Changes save automatically and apply to the next email processed." />
      {storageFull && <div className="sim-banner" role="alert">This browser is out of storage, so recent changes may not be saved. Delete some large files in Knowledge files.</div>}

      <Card title="AI engine" hint="What reads each message and writes the draft.">
        <div className="mode-cards" role="radiogroup" aria-label="AI engine" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {[['ai', 'AI language model', 'Reads for meaning, so it can recognise a sensitive situation even when no trigger word appears. Drafts are grounded in your documents, and every quote is verified.'], ['simulated', 'Simulated (word matching)', 'Free and instant, but only matches the trigger words in your Risk filters. Useful for comparison.']].map(([id, t, d]) => (
            <button key={id} type="button" role="radio" aria-checked={s.ai.engine === id} className={`mode-card ${s.ai.engine === id ? 'on' : ''}`}
              onClick={() => { set({ ai: { ...s.ai, engine: id } }, `AI engine changed to "${t}"`); setCheck(null) }}>
              <strong>{t}</strong><span className="muted small">{d}</span>
            </button>
          ))}
        </div>
        {s.ai.engine === 'ai' && (
          <div style={{ marginTop: 16 }}>
            <Field label="Model" hint="An OpenRouter model name. Leave the default unless your instructor suggests another.">
              {(id) => <input id={id} type="text" value={s.ai.model} onChange={(e) => set({ ai: { ...s.ai, model: e.target.value } })} placeholder={DEFAULT_MODEL} />}
            </Field>
            <div className="row">
              <button className="btn" disabled={check === 'busy'} onClick={async () => {
                setCheck('busy')
                try { await testConnection(s.ai.model); setCheck({ ok: true }) } catch (e) { setCheck({ ok: false, msg: e.message }) }
              }}>{check === 'busy' ? 'Checking...' : 'Check the AI connection'}</button>
              {check && check !== 'busy' && (check.ok ? <Badge tone="green">Connected</Badge> : <span className="muted small"><Badge tone="red">Not connected</Badge> {check.msg} Messages will use the simulated engine until this works.</span>)}
            </div>
            <div className="guardrail" role="note"><Icon name="lock" /><div>The AI only reads and drafts. Where an email goes, and whether it is sent, is decided by your Workflow, never by the AI. Messages and your documents are sent to the AI service to be read, so use made-up data while testing.</div></div>
          </div>
        )}
      </Card>

      <Card title="Where did the reply rules go?">
        <p>How replies are routed now lives in the <a href="#/admin/workflow">Workflow</a>. There you decide, with blocks, what is flagged as high-risk (Risk filters), whether replies send automatically or wait for a person (the Email sent block), who gets alerted, and how confident the AI must be before anything is sent.</p>
        <p className="muted small" style={{ marginTop: 8 }}>This page keeps the things that apply everywhere: how replies are written, the AI engine, the Zoro connection, and reporting.</p>
        <div style={{ marginTop: 12 }}><a className="btn" href="#/admin/workflow">Open the Workflow</a></div>
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
