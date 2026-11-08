import { useCallback, useEffect, useState } from 'react'
import { useApp, uid } from '../store'
import { STARTER_TEMPLATES } from '../workflow/templates'
import { getAuthor, loadLocal, pack, reasonText, sanitizeWorkflow, saveLocal, setAuthor, teamList, teamRemove, teamSave, unpack } from '../workflow/presets'
import { Badge, Field, Icon, Modal, Toggle, fmtDate } from './ui'

const blocksIn = (wf) => wf.nodes.length

export default function PresetsDialog({ onClose, workflow, onLoaded }) {
  const { loadWorkflow, toast, log } = useApp()
  const [tab, setTab] = useState('saved')
  const [team, setTeam] = useState({ status: 'checking', list: [], reason: '' })
  const [local, setLocal] = useState(loadLocal)
  const [confirm, setConfirm] = useState(null) // { label, make: () => Promise<workflow|null> }
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [author, setAuth] = useState(getAuthor)
  const [share, setShare] = useState(true)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    setTeam((t) => ({ ...t, status: 'checking' }))
    const r = await teamList()
    setTeam(r.ok ? { status: 'ok', list: r.presets, reason: '' } : { status: 'off', list: [], reason: r.reason })
  }, [])
  useEffect(() => { refresh() }, [refresh]) // eslint-disable-line react-hooks/set-state-in-effect

  const teamOn = team.status === 'ok'
  const teamKeys = new Set(team.list.map((p) => p.key))
  const all = [
    ...team.list.map((p) => ({ ...p, scope: 'team' })),
    ...local.filter((p) => !teamKeys.has(p.key)).map((p) => ({ ...p, scope: 'local' })),
  ].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))

  async function open(p) {
    try {
      const r = sanitizeWorkflow(await unpack(p.enc, p.workflow))
      if (!r.ok) { toast(`Could not load "${p.name}". ${r.error}`, 'warn'); return null }
      return r.workflow
    } catch { toast(`Could not load "${p.name}". It looks damaged.`, 'warn'); return null }
  }

  async function saveNew(existing) {
    const title = (existing?.name || name).trim()
    if (!title) return
    setSaving(true)
    try {
      const packed = await pack({ nodes: workflow.nodes.map((n) => ({ id: n.id, position: n.position, data: n.data })), edges: workflow.edges.map((e) => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target })) })
      if (!packed) { toast('This design is too large to save as a preset. Remove some blocks and try again.', 'warn'); return }
      const rec = { key: existing?.key || uid('p'), name: title.slice(0, 80), description: (existing ? existing.description : desc).slice(0, 300), author: (existing?.author ?? author).slice(0, 80), savedAt: new Date().toISOString(), ...packed }
      if (!existing) setAuthor(author)
      // always keep a copy in this browser
      const nextLocal = [rec, ...local.filter((p) => p.key !== rec.key)]
      setLocal(nextLocal); saveLocal(nextLocal)
      let sharedOk = false; let why = ''
      if ((existing ? existing.scope === 'team' : share) && teamOn) {
        const r = await teamSave(rec); sharedOk = r.ok; why = r.ok ? '' : reasonText(r.reason)
      }
      log('workflow', `Preset "${rec.name}" saved${sharedOk ? ' for the team' : ''}`)
      toast(sharedOk ? `Saved "${rec.name}" and shared it with the team.` : why ? `Saved "${rec.name}" in this browser only. ${why}` : `Saved "${rec.name}" in this browser.`, why ? 'warn' : 'ok')
      if (!existing) { setName(''); setDesc('') }
      if (sharedOk) refresh()
    } finally { setSaving(false) }
  }

  async function remove(p) {
    const next = local.filter((x) => x.key !== p.key); setLocal(next); saveLocal(next)
    if (p.scope === 'team') {
      const r = await teamRemove(p)
      toast(r.ok ? `Removed "${p.name}" for the team.` : `Removed from this browser. ${reasonText(r.reason)}`, r.ok ? 'ok' : 'warn')
      if (r.ok) refresh()
    } else toast(`Removed "${p.name}".`)
    log('workflow', `Preset "${p.name}" removed`)
  }

  async function doLoad() {
    const wf = await confirm.make()
    if (!wf) { setConfirm(null); return }
    loadWorkflow(wf, confirm.label); toast(`Loaded "${confirm.label}". Your previous design can be restored.`)
    onLoaded?.(); onClose()
  }

  const status = team.status === 'checking'
    ? <Badge>Checking team sharing...</Badge>
    : teamOn ? <Badge tone="green">Team sharing connected</Badge> : <Badge tone="amber">Team sharing not available</Badge>

  return (
    <Modal title="Workflow presets" onClose={onClose} wide>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="tabs" style={{ margin: 0, border: 0 }}>
          <button className={tab === 'saved' ? 'on' : ''} onClick={() => setTab('saved')}>Saved presets</button>
          <button className={tab === 'templates' ? 'on' : ''} onClick={() => setTab('templates')}>Starter templates</button>
        </div>
        <div className="row">{status}<button className="btn small" onClick={refresh}>Check again</button></div>
      </div>
      {!teamOn && team.status === 'off' && <p className="muted small" style={{ marginBottom: 12 }}>{reasonText(team.reason)} Presets you save will stay in this browser until sharing works.</p>}

      {confirm && (
        <div className="outcome amber" role="alertdialog" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Icon name="alert" />
          <div style={{ flex: '1 1 260px' }}><strong>Replace your current design with "{confirm.label}"?</strong><p>Your current design is kept. Use "Restore previous design" on the Workflow page to bring it back.</p></div>
          <div className="row"><button className="btn primary" onClick={doLoad}>Replace</button><button className="btn" onClick={() => setConfirm(null)}>Cancel</button></div>
        </div>
      )}

      {tab === 'templates' ? (
        <div className="preset-grid">
          {STARTER_TEMPLATES.map((t) => {
            const wf = t.make()
            return (
              <div key={t.id} className="preset-card">
                <strong>{t.name}</strong>
                <p className="muted small">{t.description}</p>
                <div className="row between"><span className="muted small">{blocksIn(wf)} blocks</span><button className="btn small primary" onClick={() => setConfirm({ label: t.name, make: async () => t.make() })}>Use this template</button></div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <div className="preset-save">
            <h3>Save your current design as a preset</h3>
            <div className="two-col">
              <Field label="Preset name">{(id) => <input id={id} type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cautious launch" />}</Field>
              <Field label="Your name (shown to the team)">{(id) => <input id={id} type="text" value={author} maxLength={80} onChange={(e) => setAuth(e.target.value)} placeholder="Optional" />}</Field>
            </div>
            <Field label="What is it for?">{(id) => <input id={id} type="text" value={desc} maxLength={300} onChange={(e) => setDesc(e.target.value)} placeholder="A short note so teammates know when to use it" />}</Field>
            <div className="row between">
              <label className="row" style={{ gap: 10 }}><Toggle label="Share with the team" checked={share && teamOn} disabled={!teamOn} onChange={setShare} /><span>Share with the whole team{!teamOn && <span className="muted small"> (not available right now)</span>}</span></label>
              <button className="btn primary" disabled={!name.trim() || saving} onClick={() => saveNew(null)}>{saving ? 'Saving...' : 'Save preset'}</button>
            </div>
          </div>

          <h3 style={{ margin: '18px 0 8px' }}>Saved presets ({all.length})</h3>
          {all.length === 0 ? <p className="muted">Nothing saved yet. Save your current design above, and it will be listed here.</p> : (
            <div className="preset-list">
              {all.map((p) => (
                <div key={p.key} className="preset-card">
                  <div className="row between"><strong>{p.name}</strong>{p.scope === 'team' ? <Badge tone="blue">Team</Badge> : <Badge>This browser only</Badge>}</div>
                  {p.description && <p className="muted small">{p.description}</p>}
                  <p className="muted small">{p.author ? `Saved by ${p.author} · ` : ''}{p.savedAt ? fmtDate(p.savedAt) : ''}</p>
                  <div className="row">
                    <button className="btn small primary" onClick={() => setConfirm({ label: p.name, make: () => open(p) })}>Load</button>
                    <button className="btn small" onClick={() => saveNew(p)} title="Replace this preset with your current design">Update with current design</button>
                    <button className="btn small danger" onClick={() => remove(p)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
