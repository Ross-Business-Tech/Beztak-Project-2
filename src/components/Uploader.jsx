import { useRef, useState } from 'react'
import { useApp } from '../store'
import { FILE_FOLDERS } from '../data/defaults'
import { Field, Modal } from './ui'

const TEXT_EXT = /\.(txt|md|markdown|csv|json|html?|rtf)$/i
const MAX_TEXT = 60000

/** Drop zone + "paste text" option. Text files are read so the simulated AI can search them. */
export function Uploader({ test = false, folder = 'Other' }) {
  const { addFile, toast, log } = useApp()
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const [pasting, setPasting] = useState(false)

  async function ingest(list) {
    for (const f of Array.from(list)) {
      const readable = f.type.startsWith('text/') || TEXT_EXT.test(f.name)
      let content = null
      if (readable) {
        try { content = (await f.text()).slice(0, MAX_TEXT) } catch { content = null }
      }
      addFile({
        name: f.name, folder, size: f.size, type: f.type || 'file', active: true, test, extracted: content !== null, content,
        description: test ? 'Uploaded in the Test Lab' : '',
      })
      log('file', `File "${f.name}" uploaded${test ? ' (test)' : ''}`)
      toast(content !== null ? `Added ${f.name}` : `Added ${f.name}. Text from PDF/Word files can't be read in this sandbox yet.`, content !== null ? 'ok' : 'warn')
    }
  }

  return (
    <>
      <div className={`drop ${over ? 'over' : ''}`} role="button" tabIndex={0}
        onClick={() => input.current.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); ingest(e.dataTransfer.files) }}>
        <div style={{ fontSize: '1.6rem' }} aria-hidden>📄</div>
        <strong>Drop files here or tap to choose</strong>
        <p className="muted small">Best for testing: .txt, .md or .csv files (the AI can read these). PDF and Word files are stored but not read yet.</p>
        <input ref={input} type="file" multiple hidden onChange={(e) => { ingest(e.target.files); e.target.value = '' }} />
      </div>
      <div style={{ marginTop: 10 }}>
        <button className="btn small" onClick={() => setPasting(true)}>＋ Paste text as a document</button>
      </div>
      {pasting && <PasteModal test={test} folder={folder} onClose={() => setPasting(false)} />}
    </>
  )
}

function PasteModal({ test, folder, onClose }) {
  const { addFile, toast, log } = useApp()
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [fold, setFold] = useState(folder)
  function save() {
    const fileName = (name.trim() || 'Pasted-document') + (/\.\w+$/.test(name) ? '' : '.txt')
    addFile({ name: fileName, folder: fold, size: new Blob([text]).size, type: 'text/plain', active: true, test, extracted: true, content: text.slice(0, MAX_TEXT), description: 'Pasted text' })
    log('file', `Document "${fileName}" added from pasted text${test ? ' (test)' : ''}`)
    toast(`Added ${fileName}`)
    onClose()
  }
  return (
    <Modal title="Paste a document" onClose={onClose} wide>
      <Field label="Document name">{(id) => <input id={id} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bereavement-Policy" />}</Field>
      <Field label="Folder">{(id) => <select id={id} value={fold} onChange={(e) => setFold(e.target.value)}>{FILE_FOLDERS.map((f) => <option key={f}>{f}</option>)}</select>}</Field>
      <Field label="Text" hint="Separate paragraphs with a blank line. The AI looks for answers paragraph by paragraph.">
        {(id) => <textarea id={id} rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="Employees receive 3 days of paid bereavement leave for immediate family…" />}
      </Field>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!text.trim()} onClick={save}>Add document</button>
      </div>
    </Modal>
  )
}
