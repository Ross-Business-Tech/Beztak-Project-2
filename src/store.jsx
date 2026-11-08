import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_RULES, DEFAULT_SETTINGS, SAMPLE_FILES, SCENARIOS, SEED_EMAILS } from './data/defaults'
import { analyzeEmail, statusFromDecision } from './engine/mockAI'

const KEY = 'hr-helpdesk-sandbox-v2'
const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

let counter = 0
export const uid = (p) => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

function makeSeed() {
  const settings = DEFAULT_SETTINGS
  const rules = DEFAULT_RULES
  const files = SAMPLE_FILES
  const emails = []
  // Oldest first so the per-sender limit works the way it would live.
  for (const s of [...SEED_EMAILS].sort((a, b) => b.minutesAgo - a.minutesAgo)) {
    const sc = SCENARIOS.find((x) => x.id === s.scenario)
    const receivedAt = new Date(Date.now() - s.minutesAgo * 60000).toISOString()
    const email = { id: uid('e'), name: sc.name, from: sc.from, subject: sc.subject, body: sc.body, attachments: [], receivedAt, source: 'sample' }
    const result = analyzeEmail(email, { settings, rules, files, history: emails }, 'auto_safe')
    let status = statusFromDecision(result.decision)
    const history = [{ at: receivedAt, text: 'Email received' }]
    history.push({ at: receivedAt, text: status === 'auto_sent' ? 'Reply sent automatically' : status === 'escalated' ? 'Escalated to a person' : 'Draft created, waiting for review' })
    let finalReply = status === 'auto_sent' ? result.draft : null
    if (status === 'pending_review' && s.minutesAgo > 1000 && result.draft) {
      status = 'approved_sent'; finalReply = result.draft
      history.push({ at: receivedAt, text: 'Reviewed and sent by a person' })
    }
    emails.push({ ...email, result, status, finalReply, history })
  }
  return { settings, rules, files, emails: emails.reverse(), activity: [{ id: uid('a'), at: new Date().toISOString(), type: 'system', text: 'Test environment created with sample data' }] }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw)
      return { ...makeSeed(), ...d, settings: { ...DEFAULT_SETTINGS, ...d.settings, integrations: { ...DEFAULT_SETTINGS.integrations, ...(d.settings?.integrations || {}) } } }
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
    saveRule(rule) {
      setData((d) => {
        const exists = d.rules.some((r) => r.id === rule.id)
        return { ...d, rules: exists ? d.rules.map((r) => (r.id === rule.id ? rule : r)) : [...d.rules, rule] }
      })
    },
    deleteRule(id) { setData((d) => ({ ...d, rules: d.rules.filter((r) => r.id !== id) })) },
    addFile(file) { setData((d) => ({ ...d, files: [{ ...file, id: uid('f') }, ...d.files] })) },
    updateFile(id, patch) { setData((d) => ({ ...d, files: d.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) })) },
    deleteFile(id) { setData((d) => ({ ...d, files: d.files.filter((f) => f.id !== id) })) },

    /** Run a test email through the simulated AI and store the result. */
    sendTestEmail(input, overrideMode) {
      const d = dataRef.current
      const email = { id: uid('e'), attachments: [], ...input, receivedAt: new Date().toISOString(), source: 'test' }
      const result = analyzeEmail(email, { settings: d.settings, rules: d.rules, files: d.files, history: d.emails }, overrideMode || undefined)
      const status = statusFromDecision(result.decision)
      const now = new Date().toISOString()
      const history = [
        { at: now, text: 'Test email received' },
        { at: now, text: status === 'auto_sent' ? 'Reply sent automatically (simulated, nothing really sent)' : status === 'escalated' ? 'Escalated to a person' : 'Draft created, waiting for review' },
      ]
      const full = { ...email, result, status, finalReply: status === 'auto_sent' ? result.draft : null, history }
      setData((s) => ({ ...s, emails: [full, ...s.emails] }))
      log('email', `Test email "${email.subject}" processed: ${status.replace('_', ' ')}`)
      return full
    },
    /** Review actions: send (with edited text) or discard. */
    resolveEmail(id, kind, text) {
      setData((d) => ({
        ...d,
        emails: d.emails.map((e) => {
          if (e.id !== id) return e
          const at = new Date().toISOString()
          if (kind === 'send') return { ...e, status: 'approved_sent', finalReply: text, history: [...e.history, { at, text: 'Reviewed and sent by a person (simulated)' }] }
          if (kind === 'discard') return { ...e, status: 'discarded', history: [...e.history, { at, text: 'Closed without sending a reply' }] }
          return e
        }),
      }))
      log('review', kind === 'send' ? 'A reviewer sent a reply (simulated)' : 'A reviewer closed an email without replying')
    },
    saveDraft(id, text) {
      setData((d) => ({ ...d, emails: d.emails.map((e) => (e.id === id ? { ...e, editedDraft: text } : e)) }))
    },
    regenerate(id) {
      const d = dataRef.current
      const e = d.emails.find((x) => x.id === id)
      if (!e) return
      const result = analyzeEmail(e, { settings: d.settings, rules: d.rules, files: d.files, history: d.emails.filter((x) => x.id !== id) }, 'draft')
      const next = statusFromDecision(result.decision)
      setData((s) => ({ ...s, emails: s.emails.map((x) => (x.id === id ? { ...x, result, editedDraft: undefined, status: next === 'auto_sent' ? 'pending_review' : next, history: [...x.history, { at: new Date().toISOString(), text: 'Draft regenerated with current settings' }] } : x)) }))
    },
    deleteEmail(id) { setData((d) => ({ ...d, emails: d.emails.filter((e) => e.id !== id) })) },
    clearTestEmails() { setData((d) => ({ ...d, emails: d.emails.filter((e) => e.source !== 'test') })); log('system', 'Test emails cleared') },
    resetAll() { localStorage.removeItem(KEY); setData(makeSeed()) },
  }), [toast, log])

  const value = { ...data, ...actions, toasts, storageFull }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
