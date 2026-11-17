import { useRef, useState } from 'react'
import { useApp } from '../store'
import { FILE_FOLDERS } from '../data/defaults'
import { SPLIT_ABOVE, prepareDocument } from '../lib/prepareDocument'
import { Field, Icon, Modal, Toggle } from './ui'

const TEXT_EXT = /\.(txt|md|markdown|csv|json|html?|rtf)$/i

/** The one choice about long documents, shown wherever documents are added. */
function SplitOption({ split, onChange }) {
  return (
    <div className="option-row">
      <div>
        <strong>Split long documents into sections</strong>
        <p className="muted small">Recommended for handbooks. For each question the AI reads only the sections that match, which is faster and cheaper. Applies to documents over {SPLIT_ABOVE.toLocaleString()} characters.</p>
      </div>
      <Toggle label="Split long documents into sections" checked={split} onChange={onChange} />
    </div>
  )
}

/** Drop zone + "paste text" option. Text files are read so the AI can search them. */
export function Uploader({ test = false, folder = 'Other' }) {
  const { addFile, toast, log } = useApp()
  const input = useRef(null)
  const [split, setSplit] = useState(true)
  const [over, setOver] = useState(false)
  const [pasting, setPasting] = useState(false)

  async function ingest(list) {
    for (const f of Array.from(list)) {
      const readable = f.type.startsWith('text/') || TEXT_EXT.test(f.name)
      let text = null
      if (readable) { try { text = await f.text() } catch { text = null } }
      const doc = text === null ? { content: null, sections: [], sectioned: false } : prepareDocument(text, { split })
      addFile({
        name: f.name, folder, size: f.size, type: f.type || 'file', active: true, test, extracted: doc.content !== null, content: doc.content,
        ...(doc.sectioned ? { sectioned: true, sections: doc.sections } : {}),
        description: test ? 'Uploaded in the Test Lab' : doc.sectioned ? `Split into ${doc.sections.length.toLocaleString()} sections` : '',
      })
      log('file', `File "${f.name}" uploaded${test ? ' (test)' : ''}${doc.sectioned ? `, split into ${doc.sections.length} sections` : ''}`)
      if (doc.content === null) toast(`Added ${f.name}. Text from PDF/Word files can't be read in this test environment yet.`, 'warn')
      else toast(`Added ${f.name}${doc.sectioned ? ` (${doc.sections.length.toLocaleString()} sections)` : ''}`)
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
        <p className="muted small">The AI reads .txt, .md, .csv, .json and .html files. PDF and Word files are stored but not read yet.</p>
        <input ref={input} type="file" multiple hidden onChange={(e) => { ingest(e.target.files); e.target.value = '' }} />
      </div>
      <SplitOption split={split} onChange={setSplit} />
      <div style={{ marginTop: 12 }}>
        <button className="btn small" onClick={() => setPasting(true)}>Paste text as a document</button>
      </div>
      {pasting && <PasteModal test={test} folder={folder} onClose={() => setPasting(false)} />}
    </>
  )
}

function PasteModal({ test, folder, onClose }) {
  const { addFile, toast, log } = useApp()
  const [split, setSplit] = useState(true)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [fold, setFold] = useState(folder)
  function save() {
    const fileName = (name.trim() || 'Pasted-document') + (/\.\w+$/.test(name) ? '' : '.txt')
    const doc = prepareDocument(text, { split })
    addFile({ name: fileName, folder: fold, size: new Blob([text]).size, type: 'text/plain', active: true, test, extracted: true, content: doc.content, ...(doc.sectioned ? { sectioned: true, sections: doc.sections } : {}), description: doc.sectioned ? `Pasted text, split into ${doc.sections.length.toLocaleString()} sections` : 'Pasted text' })
    log('file', `Document "${fileName}" added from pasted text${test ? ' (test)' : ''}`)
    toast(`Added ${fileName}`)
    onClose()
  }
  return (
    <Modal title="Paste a document" onClose={onClose} wide>
      <Field label="Document name">{(id) => <input id={id} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bereavement-Policy" />}</Field>
      <Field label="Folder">{(id) => <select id={id} value={fold} onChange={(e) => setFold(e.target.value)}>{FILE_FOLDERS.map((f) => <option key={f}>{f}</option>)}</select>}</Field>
      <Field label="Text" hint="Put each topic under a heading on its own line (for example ## Bereavement leave) and separate paragraphs with a blank line.">
        {(id) => <textarea id={id} rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="Employees receive 3 days of paid bereavement leave for immediate family…" />}
      </Field>
      {text.length > SPLIT_ABOVE && <SplitOption split={split} onChange={setSplit} />}
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!text.trim()} onClick={save}>Add document</button>
      </div>
    </Modal>
  )
}
