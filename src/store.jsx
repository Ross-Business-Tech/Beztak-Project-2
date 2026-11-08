import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, SAMPLE_FILES, SCENARIOS, SEED_EMAILS } from './data/defaults'
import { statusFromDecision } from './engine/mockAI'
import { runWorkflow, runWorkflowSync } from './workflow/runner'
import { makeDefaultWorkflow, rulesOf } from './workflow/defaults'

const KEY = 'hr-helpdesk-sandbox-v3'
const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

let counter = 0
export const uid = (p) => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

function makeSeed() {
  const settings = DEFAULT_SETTINGS
  const files = SAMPLE_FILES
  const workflow = makeDefaultWorkflow()
  const sampleFlow = makeDefaultWorkflow({ autoSend: true }) // sample history shows some automatic replies
  const emails = []
  // Oldest first so the per-sender limit works the way it would live.
  for (const s of [...SEED_EMAILS].sort((a, b) => b.minutesAgo - a.minutesAgo)) {
    const sc = SCENARIOS.find((x) => x.id === s.scenario)
    const receivedAt = new Date(Date.now() - s.minutesAgo * 60000).toISOString()
    const email = { id: uid('e'), name: sc.name, from: sc.from, subject: sc.subject, body: sc.body, attachments: [], receivedAt, source: 'sample' }
    const result = runWorkflowSync({ email, workflow: sampleFlow, settings, files, history: emails })
    let status = statusFromDecision(result.decision)
    const history = [{ at: receivedAt, text: 'Email received' }]
    history.push({ at: receivedAt, text: status === 'auto_sent' ? 'Reply sent automatically' : status === 'escalated' ? 'Escalated to a person' : status === 'discarded' ? 'Closed without a reply' : 'Draft created, waiting for review' })
    let finalReply = status === 'auto_sent' ? result.draft : null
    let wasEdited
    if (status === 'pending_review' && s.minutesAgo > 1000 && result.draft) {
      status = 'approved_sent'; finalReply = result.draft; wasEdited = s.minutesAgo % 2 === 0 && s.minutesAgo > 2000
      history.push({ at: receivedAt, text: 'Reviewed and sent by a person' })
    }
    emails.push({ ...email, result, status, finalReply, wasEdited, history })
  }
  return { settings, workflow, files, emails: emails.reverse(), activity: [{ id: uid('a'), at: new Date().toISOString(), type: 'system', text: 'Test environment created with sample data' }] }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw)
      return { ...makeSeed(), ...d, settings: { ...DEFAULT_SETTINGS, ...d.settings, ai: { ...DEFAULT_SETTINGS.ai, ...(d.settings?.ai || {}) }, integrations: { ...DEFAULT_SETTINGS.integrations, ...(d.settings?.integrations || {}) } } }
    }
  } catch { /* fall through */ }
  return makeSeed()
}

export function AppProvider({ children }) {
  const [data, setData] = useState(load)
  const [toasts, setToasts] = useState([])
  const [storageFull, setStorageFull] = useState(false)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); setStorageFull(false) } catch { setStorageFull(true) }
  }, [data])

  const toast = useCallback((text, tone = 'ok') => {
    const id = uid('t')
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const log = useCallback((type, text) => {
    setData((d) => ({ ...d, activity: [{ id: uid('a'), at: new Date().toISOString(), type, text }, ...d.activity].slice(0, 300) }))
  }, [])

  const actions = useMemo(() => ({
    toast, log,
    updateSettings(patch, note) {
      setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
      if (note) log('settings', note)
    },
    addFile(file) { setData((d) => ({ ...d, files: [{ ...file, id: uid('f') }, ...d.files] })) },
    updateFile(id, patch) { setData((d) => ({ ...d, files: d.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) })) },
    deleteFile(id) { setData((d) => ({ ...d, files: d.files.filter((f) => f.id !== id) })) },

    /** Run a test email through the simulated AI and store the result. */
    setWorkflow(workflow) { setData((d) => ({ ...d, workflow })) },
    resetWorkflow() { setData((d) => ({ ...d, workflow: makeDefaultWorkflow() })); log('workflow', 'Workflow reset to the starter design') },
    async sendTestEmail(input) {
      const d = dataRef.current
      const email = { id: uid('e'), attachments: [], ...input, receivedAt: new Date().toISOString(), source: 'test' }
      const result = await runWorkflow({ email, workflow: d.workflow, settings: d.settings, files: d.files, history: d.emails })
      const status = statusFromDecision(result.decision)
      const now = new Date().toISOString()
      const history = [
        { at: now, text: 'Test email received' },
        { at: now, text: status === 'auto_sent' ? 'Reply sent automatically (simulated, nothing really sent)' : status === 'escalated' ? 'Escalated to a person' : 'Draft created, waiting for review' },
      ]
      const full = { ...email, result, status, finalReply: status === 'auto_sent' ? result.draft : null, history }
      setData((s) => ({ ...s, emails: [full, ...s.emails] }))
      log('email', `Test email "${email.subject}" processed: ${status.replace('_', ' ')}`)
      result.alerts.forEach((a) => log('alert', `Alert to ${a.role}: ${a.message} ("${email.subject}")`))
      return full
    },
    /** Review actions: send (with edited text) or discard. */
    resolveEmail(id, kind, text) {
      setData((d) => ({
        ...d,
        emails: d.emails.map((e) => {
          if (e.id !== id) return e
          const at = new Date().toISOString()
          if (kind === 'send') return { ...e, status: 'approved_sent', finalReply: text, wasEdited: text.trim() !== (e.result.draft || '').trim(), history: [...e.history, { at, text: 'Reviewed and sent by a person (simulated)' }] }
          if (kind === 'discard') return { ...e, status: 'discarded', history: [...e.history, { at, text: 'Closed without sending a reply' }] }
          return e
        }),
      }))
      log('review', kind === 'send' ? 'A reviewer sent a reply (simulated)' : 'A reviewer closed an email without replying')
    },
    addNote(id, text) {
      const note = { id: uid('n'), at: new Date().toISOString(), text }
      setData((d) => ({ ...d, emails: d.emails.map((e) => (e.id === id ? { ...e, notes: [...(e.notes || []), note] } : e)) }))
      log('review', 'A case note was added')
    },
    saveDraft(id, text) {
      setData((d) => ({ ...d, emails: d.emails.map((e) => (e.id === id ? { ...e, editedDraft: text } : e)) }))
    },
    async regenerate(id) {
      const d = dataRef.current
      const e = d.emails.find((x) => x.id === id)
      if (!e) return
      const result = await runWorkflow({ email: e, workflow: d.workflow, settings: d.settings, files: d.files, history: d.emails.filter((x) => x.id !== id) })
      const next = statusFromDecision(result.decision)
      setData((s) => ({ ...s, emails: s.emails.map((x) => (x.id === id ? { ...x, result, editedDraft: undefined, status: next === 'auto_sent' ? 'pending_review' : next, history: [...x.history, { at: new Date().toISOString(), text: 'Draft regenerated with current settings' }] } : x)) }))
    },
    deleteEmail(id) { setData((d) => ({ ...d, emails: d.emails.filter((e) => e.id !== id) })) },
    clearTestEmails() { setData((d) => ({ ...d, emails: d.emails.filter((e) => e.source !== 'test') })); log('system', 'Test emails cleared') },
    resetAll() { localStorage.removeItem(KEY); setData(makeSeed()) },
  }), [toast, log])

  const rules = useMemo(() => rulesOf(data.workflow), [data.workflow])
  const value = { ...data, rules, ...actions, toasts, storageFull }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
