import { useMemo, useRef, useState } from 'react'
import { useApp } from '../store'
import { FILE_FOLDERS } from '../data/defaults'
import { MAX_FILE_BYTES, PLAIN_CHARS, fmtMB, prepareDocument, totalLimit, usedBytes } from '../lib/uploadLimits'
import { Field, Icon, Modal, Toggle } from './ui'

const TEXT_EXT = /\.(txt|md|markdown|csv|json|html?|rtf)$/i

/** Drop zone + "paste text" option. Text files are read so the simulated AI can search them. */
export function Uploader({ test = false, folder = 'Other' }) {
  const { addFile, toast, log, files, serverMode } = useApp()
  const input = useRef(null)
  const [split, setSplit] = useState(true)
  const [over, setOver] = useState(false)
  const [pasting, setPasting] = useState(false)

  async function ingest(list) {
    const have = [...files]
    for (const f of Array.from(list)) {
      const readable = f.type.startsWith('text/') || TEXT_EXT.test(f.name)
      if (f.size > MAX_FILE_BYTES) { toast(`${f.name} was not added: it is ${fmtMB(f.size)} and the limit is ${fmtMB(MAX_FILE_BYTES)} per file.`, 'warn'); continue }
      let text = null
      if (readable) { try { text = await f.text() } catch { text = null } }
      let doc = { ok: true, content: null, sections: [], sectioned: false, warning: '' }
      if (text !== null) {
        doc = prepareDocument(text, { split, existing: have, serverMode })
        if (!doc.ok) { toast(`${f.name} was not added. ${doc.error}`, 'warn'); continue }
      }
      const file = {
        name: f.name, folder, size: f.size, type: f.type || 'file', active: true, test, extracted: doc.content !== null, content: doc.content,
        ...(doc.sectioned ? { sectioned: true, sections: doc.sections } : {}),
        description: test ? 'Uploaded in the Test Lab' : doc.sectioned ? `Split into ${doc.sections.length.toLocaleString()} sections` : '',
      }
      addFile(file); have.push(file)
      log('file', `File "${f.name}" uploaded${test ? ' (test)' : ''}${doc.sectioned ? `, split into ${doc.sections.length} sections` : ''}`)
      if (doc.warning) toast(`Added ${f.name}, but not all of it. ${doc.warning}`, 'warn')
      else toast(doc.content !== null ? `Added ${f.name}${doc.sectioned ? ` (${doc.sections.length.toLocaleString()} sections)` : ''}` : `Added ${f.name}. Text from PDF/Word files can't be read in this test environment yet.`, doc.content !== null ? 'ok' : 'warn')
    }
  }

  return (
    <>
      <div className={`drop ${over ? 'over' : ''}`} role="button" tabIndex={0}
        onClick={() => input.current.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); ingest(e.dataTransfer.files) }}>
        <Icon name="upload" size={26} />
        <strong>Drop files here or tap to choose</strong>
        <p className="muted small">Best for testing: .txt, .md or .csv files (the AI can read these). PDF and Word files are stored but not read yet.</p>
        <input ref={input} type="file" multiple hidden onChange={(e) => { ingest(e.target.files); e.target.value = '' }} />
      </div>
      <div className="row between" style={{ marginTop: 12, alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <strong>Split long documents into sections</strong>
          <p className="muted small">Recommended for handbooks. Each document is cut at its headings, and for every email the AI is shown only the few best-matching sections. Only documents over {PLAIN_CHARS.toLocaleString()} characters are split. With this off, longer documents are cut at {PLAIN_CHARS.toLocaleString()} characters and the rest is ignored.</p>
        </div>
        <Toggle label="Split long documents into sections" checked={split} onChange={setSplit} />
      </div>
      <UploadLimits files={files} serverMode={serverMode} />
      <div style={{ marginTop: 10 }}>
        <button className="btn small" onClick={() => setPasting(true)}>Paste text as a document</button>
      </div>
      {pasting && <PasteModal test={test} folder={folder} onClose={() => setPasting(false)} />}
    </>
  )
}

/** The upload rules in plain words, with how much room is left. */
export function UploadLimits({ files, serverMode }) {
  const used = useMemo(() => usedBytes(files), [files]); const total = totalLimit(serverMode)
  const pct = Math.min(100, Math.round((used / total) * 100))
  return (
    <div className="guardrail" role="note" style={{ marginTop: 12, display: 'block' }}>
      <strong>Upload limits</strong>
      <ul className="small" style={{ margin: '6px 0 8px 18px' }}>
        <li>Up to {fmtMB(MAX_FILE_BYTES)} per file, and {fmtMB(total)} for all files together{serverMode ? '' : ' (this demo keeps files in your browser)'}.</li>
        <li>The AI reads text files: .txt, .md, .csv, .json, .html. PDF and Word files are stored but not read yet.</li>
        <li>Very long documents only work with "Split long documents into sections" turned on when you upload.</li>
        <li>Use made-up data while testing.</li>
      </ul>
      <div className="meter" aria-hidden="true" style={{ height: 8, background: 'var(--line, #ddd)', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: pct > 85 ? 'var(--red, #c0392b)' : 'var(--blue, #2563eb)' }} /></div>
      <span className="muted small">{fmtMB(used)} of {fmtMB(total)} used ({pct}%)</span>
    </div>
  )
}

function PasteModal({ test, folder, onClose }) {
  const { addFile, toast, log, files, serverMode } = useApp()
  const [split, setSplit] = useState(true)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [fold, setFold] = useState(folder)
  function save() {
    const fileName = (name.trim() || 'Pasted-document') + (/\.\w+$/.test(name) ? '' : '.txt')
    const doc = prepareDocument(text, { split, existing: files, serverMode })
    if (!doc.ok) { toast(doc.error, 'warn'); return }
    addFile({ name: fileName, folder: fold, size: new Blob([text]).size, type: 'text/plain', active: true, test, extracted: true, content: doc.content, ...(doc.sectioned ? { sectioned: true, sections: doc.sections } : {}), description: doc.sectioned ? `Pasted text, split into ${doc.sections.length.toLocaleString()} sections` : 'Pasted text' })
    log('file', `Document "${fileName}" added from pasted text${test ? ' (test)' : ''}`)
    if (doc.warning) toast(`Added ${fileName}, but not all of it. ${doc.warning}`, 'warn'); else toast(`Added ${fileName}`)
    onClose()
  }
  return (
    <Modal title="Paste a document" onClose={onClose} wide>
      <Field label="Document name">{(id) => <input id={id} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bereavement-Policy" />}</Field>
      <Field label="Folder">{(id) => <select id={id} value={fold} onChange={(e) => setFold(e.target.value)}>{FILE_FOLDERS.map((f) => <option key={f}>{f}</option>)}</select>}</Field>
      <Field label="Text" hint="Put each topic under a heading on its own line (for example ## Bereavement leave) and separate paragraphs with a blank line.">
        {(id) => <textarea id={id} rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="Employees receive 3 days of paid bereavement leave for immediate family…" />}
      </Field>
      {text.length > PLAIN_CHARS && (
        <div className="row between" style={{ gap: 12, marginBottom: 8 }}>
          <span className="small">Split into sections (this text is over {PLAIN_CHARS.toLocaleString()} characters)</span>
          <Toggle label="Split into sections" checked={split} onChange={setSplit} />
        </div>
      )}
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!text.trim()} onClick={save}>Add document</button>
      </div>
    </Modal>
  )
}
