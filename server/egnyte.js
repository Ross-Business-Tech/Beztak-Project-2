// Egnyte: read-only. Lists a folder and downloads files so the AI can answer from them. Nothing is ever written to Egnyte.
// API: GET /pubapi/v1/fs/{path} (list) and GET /pubapi/v1/fs-content/{path} (download), with a bearer token.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function normalizeFolderPath(input) {
  const raw = String(input ?? '').trim().replace(/\\/g, '/')
  if (!raw) return ''
  if (raw.length > 500) throw Object.assign(new Error('That folder path is too long.'), { status: 400 })
  const parts = raw.split('/').filter((p) => p !== '' && p !== '.')
  if (parts.some((p) => p === '..' || /[\u0000-\u001f]/.test(p))) throw Object.assign(new Error('That folder path is not valid.'), { status: 400 })
  return `/${parts.join('/')}`
}
const enc = (p) => p.split('/').map(encodeURIComponent).join('/')

export function createEgnyteClient(cfg, fetchImpl = fetch) {
  const missing = [!cfg.baseUrl && 'EGNYTE_DOMAIN', !cfg.token && 'EGNYTE_ACCESS_TOKEN'].filter(Boolean)

  async function call(path, { retried = false } = {}) {
    const res = await fetchImpl(`${cfg.baseUrl}/pubapi/v1${path}`, { headers: { Authorization: `Bearer ${cfg.token}`, Accept: '*/*' } })
    if (cfg.delayMs) await sleep(cfg.delayMs)
    if (res.status === 429 && !retried) { await sleep(Math.min(10_000, (Number(res.headers.get('retry-after')) || 2) * 1000)); return call(path, { retried: true }) }
    if (res.ok) return res
    const e = new Error(
      res.status === 401 ? 'Egnyte rejected the access token. It has probably expired (Egnyte tokens can expire after 30 days). Create a new one and update EGNYTE_ACCESS_TOKEN.'
      : res.status === 403 ? 'Egnyte says this account may not open that folder. Check the account has at least view access.'
      : res.status === 404 ? 'Egnyte could not find that folder. Check the path.'
      : res.status === 429 ? 'Egnyte is limiting requests right now. It will try again at the next check.'
      : `Egnyte returned an error (${res.status}).`)
    e.status = res.status
    throw e
  }

  return {
    name: 'egnyte', configured: missing.length === 0, missing,

    /** One folder: its sub-folders and files. Pages through long folders. */
    async list(path) {
      const folders = []; const files = []
      let offset = 0
      for (let page = 0; page < 50; page++) {
        const res = await call(`/fs${enc(path)}?list_content=true&count=200&offset=${offset}`)
        const j = await res.json().catch(() => null)
        if (!j) throw new Error('Egnyte sent an unreadable answer.')
        if (j.is_folder === false) throw new Error('That path is a file, not a folder.')
        for (const f of j.folders || []) folders.push({ name: f.name, path: f.path })
        for (const f of j.files || []) files.push({ name: f.name, path: f.path, size: Number(f.size) || 0, checksum: f.checksum || f.entry_id || '', modified: f.last_modified || '' })
        const got = (j.folders || []).length + (j.files || []).length
        offset += got
        if (!got || offset >= (Number(j.total_count) || 0)) break
      }
      return { folders, files }
    },

    async download(path, maxBytes) {
      const res = await call(`/fs-content${enc(path)}`)
      const len = Number(res.headers.get('content-length'))
      if (len && len > maxBytes) throw new Error('This file is larger than the size limit.')
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > maxBytes) throw new Error('This file is larger than the size limit.')
      return buf
    },

    async health() {
      const top = await this.list('/')
      return { ok: true, detail: `Connected to Egnyte (${cfg.baseUrl}). ${top.folders.length} top-level folder${top.folders.length === 1 ? '' : 's'} visible.` }
    },
  }
}
