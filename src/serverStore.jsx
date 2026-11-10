// The same app state as store.jsx, but kept on the self-hosted server instead of in the browser.
// Pages use it exactly the same way (useApp). Settings, workflow and knowledge files are saved to the
// server a moment after each change; messages are processed and stored by the server.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ctx, uid } from './store'
import { makeDefaultWorkflow, rulesOf } from './workflow/defaults'
import { api } from './serverApi'

const POLL_MS = 15000

export function ServerProvider({ initial, children }) {
  const [data, setData] = useState({ settings: initial.settings, workflow: initial.workflow, files: initial.files, emails: initial.emails, activity: initial.activity, status: initial.status, evalRuns: initial.evalRuns || [], designBackup: null })
  const [toasts, setToasts] = useState([])
  const [saveError, setSaveError] = useState('')
  const user = initial.user
  const isAdmin = user.role === 'admin'
  const dataRef = useRef(data); dataRef.current = data
  const timers = useRef({})
  const seenEgnyteSync = useRef(initial.status?.egnyte?.lastSync?.at || '')

  const toast = useCallback((text, tone = 'ok') => {
    const id = uid('t')
    setToasts((t) => [...t, { id, text, tone }].slice(-4))
    if (tone !== 'warn') setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  // keep messages and activity fresh (new tickets arrive on their own). When an Egnyte sync has finished, reload the files too.
  const reloadFilesRef = useRef(null)
  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return
      try {
        const r = await api('GET', '/api/emails')
        setData((d) => ({ ...d, emails: r.emails, activity: r.activity, status: r.status }))
        const at = r.status?.egnyte?.lastSync?.at || ''
        if (at !== seenEgnyteSync.current) { seenEgnyteSync.current = at; reloadFilesRef.current?.() }
      } catch { /* shown next time */ }
    }
    const t = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick) }
  }, [])

  const saveNow = useCallback(async (key) => {
    clearTimeout(timers.current[key]); delete timers.current[key]
    // Documents copied from Egnyte are owned by the sync; only their on/off switch goes back to the server.
    const value = key === 'files' ? dataRef.current.files.map((f) => (f.source === 'egnyte' ? { id: f.id, source: 'egnyte', active: f.active } : f)) : dataRef.current[key]
    try { await api('PUT', `/api/config/${key}`, { value }); setSaveError('') } catch (e) { setSaveError(e.message) }
  }, [])
  const save = useCallback((key) => {
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => saveNow(key), 600)
  }, [saveNow])
  const flush = useCallback(() => Promise.all(Object.keys(timers.current).map(saveNow)), [saveNow])
  useEffect(() => { const h = () => { Object.keys(timers.current).forEach(saveNow) }; window.addEventListener('pagehide', h); return () => window.removeEventListener('pagehide', h) }, [saveNow])

  const log = useCallback((type, text) => {
    api('POST', '/api/log', { type, text }).catch(() => {})
    setData((d) => ({ ...d, activity: [{ id: uid('a'), at: new Date().toISOString(), type, actor: user.username, text }, ...d.activity].slice(0, 300) }))
  }, [user.username])

  const replace = (rec) => setData((d) => ({ ...d, emails: d.emails.some((e) => e.id === rec.id) ? d.emails.map((e) => (e.id === rec.id ? rec : e)) : [rec, ...d.emails] }))
  const fail = (e) => { toast(e.message, 'warn'); return { ok: false, message: e.message } }
  const adminOnly = () => { if (isAdmin) return true; toast('Only an admin can change this.', 'warn'); return false }

  const actions = useMemo(() => ({
    toast, log,
    updateSettings(patch, note) {
      if (!adminOnly()) return
      setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })); save('settings')
      if (note) log('settings', note)
    },
    addFile(file) { if (!adminOnly()) return; setData((d) => ({ ...d, files: [{ ...file, id: uid('f') }, ...d.files] })); save('files') },
    updateFile(id, patch) { if (!adminOnly()) return; setData((d) => ({ ...d, files: d.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) })); save('files') },
    deleteFile(id) { if (!adminOnly()) return; setData((d) => ({ ...d, files: d.files.filter((f) => f.id !== id) })); save('files') },

    setWorkflow(workflow) { if (!adminOnly()) return; setData((d) => ({ ...d, workflow })); save('workflow') },
    resetWorkflow() { if (!adminOnly()) return; setData((d) => ({ ...d, designBackup: { workflow: d.workflow, settings: d.settings }, workflow: makeDefaultWorkflow() })); save('workflow'); log('workflow', 'Workflow reset to the starter design') },
    // A loaded preset never changes the Zoho Desk connection or the AI model, so a shared preset cannot turn on sending or switch models.
    loadWorkflow(workflow, label, settings) {
      if (!adminOnly()) return
      setData((d) => ({ ...d, designBackup: { workflow: d.workflow, settings: d.settings }, workflow, settings: settings ? { ...settings, integrations: d.settings.integrations, ai: d.settings.ai } : d.settings }))
      save('workflow'); if (settings) save('settings')
      log('workflow', `Workflow${settings ? ' and settings' : ''} replaced by "${label}"`)
    },
    restoreWorkflow() {
      if (!adminOnly()) return
      setData((d) => (d.designBackup ? { ...d, workflow: d.designBackup.workflow, settings: { ...d.designBackup.settings, integrations: d.settings.integrations, ai: d.settings.ai }, designBackup: { workflow: d.workflow, settings: d.settings } } : d))
      save('workflow'); save('settings'); log('workflow', 'Previous design restored')
    },

    async sendTestEmail(input) {
      try { await flush(); const rec = await api('POST', '/api/emails/test', input); replace(rec); return rec } catch (e) { fail(e); return null }
    },
    async resolveEmail(id, kind, text) {
      try {
        const rec = await api('POST', `/api/emails/${id}/resolve`, { kind, text }); replace(rec)
        const last = rec.history[rec.history.length - 1]?.text || ''
        return { ok: true, message: kind === 'send' ? last.replace(/^Reviewed and approved by [^;]+; /, 'Done: ') : 'Closed without a reply' }
      } catch (e) { return fail(e) }
    },
    async importRequest(row) { try { const rec = await api('POST', '/api/emails/import', { row }); replace(rec); return rec } catch (e) { fail(e); return null } },
    async evaluateRequest(row) { try { return await api('POST', '/api/eval/one', { row }) } catch (e) { fail(e); return null } },
    async saveEvalRun(run) { try { const saved = await api('POST', '/api/eval/runs', { run }); setData((d) => ({ ...d, evalRuns: [saved, ...d.evalRuns].slice(0, 20) })); return saved } catch (e) { fail(e); return null } },
    async addNote(id, text) { try { replace(await api('POST', `/api/emails/${id}/note`, { text })) } catch (e) { fail(e) } },
    async saveDraft(id, text) { try { replace(await api('PUT', `/api/emails/${id}/draft`, { text })) } catch (e) { fail(e) } },
    async regenerate(id) { try { await flush(); replace(await api('POST', `/api/emails/${id}/regenerate`, {})) } catch (e) { fail(e) } },
    async deleteEmail(id) {
      try { await api('DELETE', `/api/emails/${id}`); setData((d) => ({ ...d, emails: d.emails.filter((e) => e.id !== id) })); return { ok: true, message: 'Deleted' } } catch (e) { return fail(e) }
    },
    async clearTestEmails() { try { await api('DELETE', '/api/emails/tests'); setData((d) => ({ ...d, emails: d.emails.filter((e) => e.source !== 'test') })) } catch (e) { fail(e) } },
    resetAll() { toast('Resetting is not available on a live server.', 'warn') },
    async reloadFiles() {
      try {
        await flush()
        const r = await api('GET', '/api/files'); const st = await api('GET', '/api/emails')
        seenEgnyteSync.current = st.status?.egnyte?.lastSync?.at || ''
        setData((d) => ({ ...d, files: r.files, status: st.status }))
      } catch (e) { fail(e) }
    },
    /** After the Egnyte link changes, a sync starts on the server. Check back until it has finished. */
    watchEgnyte() {
      let tries = 0
      const t = setInterval(async () => {
        tries += 1
        try { const st = await api('GET', '/api/emails'); const at = st.status?.egnyte?.lastSync?.at || ''; setData((d) => ({ ...d, status: st.status })); if (at !== seenEgnyteSync.current || tries > 15) { clearInterval(t); if (at !== seenEgnyteSync.current) { seenEgnyteSync.current = at; reloadFilesRef.current?.() } } } catch { clearInterval(t) }
      }, 2000)
    },
    async refresh() { const r = await api('GET', '/api/emails'); setData((d) => ({ ...d, emails: r.emails, activity: r.activity, status: r.status })) },
    async signOut() { try { await api('POST', '/api/logout', {}) } finally { window.dispatchEvent(new Event('hr-signed-out')) } },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [toast, log, save, flush, isAdmin]) 

  reloadFilesRef.current = actions.reloadFiles
  const rules = useMemo(() => rulesOf(data.workflow), [data.workflow])
  const value = { ...data, rules, ...actions, toasts, dismissToast, storageFull: false, serverMode: true, user, isAdmin, saveError }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
