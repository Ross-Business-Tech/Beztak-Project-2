import { useState } from 'react'
import { useApp } from '../store'
import { FILE_FOLDERS } from '../data/defaults'
import { Uploader } from '../components/Uploader'
import { rankSections } from '../engine/sections'
import { Badge, Card, HelpPanel, Empty, Modal, PageHeader, Toggle, fmtSize } from '../components/ui'

const PREVIEW_CHARS = 30000 // long documents would freeze the page if shown whole

export default function Files() {
  const { files, updateFile, deleteFile, toast, log } = useApp()
  const [folder, setFolder] = useState('All')
  const [q, setQ] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [view, setView] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [question, setQuestion] = useState('')
  const [found, setFound] = useState(null)
  const anySplit = files.some((f) => f.sectioned)

  const list = files.filter((f) => (folder === 'All' || f.folder === folder) && f.name.toLowerCase().includes(q.toLowerCase()))
  const readable = files.filter((f) => f.active && f.content).length
  const fromEgnyte = files.filter((f) => f.source === 'egnyte').length
  const folders = ['All', ...FILE_FOLDERS, ...(fromEgnyte ? ['Egnyte'] : [])]

  return (
    <>
      <PageHeader title="Knowledge files" subtitle="The documents the AI is allowed to answer from.">
        <button className="btn primary" onClick={() => setShowUpload(true)}>Upload files</button>
      </PageHeader>
      <HelpPanel id="files" steps={[
        'Select Upload files to add a document, or paste text. Choose the folder it belongs in.',
        'The AI answers only from files whose "AI can use" switch is on. Turn a file off to stop using it without deleting it.',
        'Use View to read a document (long ones show a preview). Use the folder filter and search to find files.',
        'Delete removes a file permanently, so prefer turning it off if you may need it again.',
      ]} note="Keep documents current and clearly written. Short documents are searched paragraph by paragraph. Long handbooks can be split into sections when you upload them: use clear headings and one topic per section." />
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <div className="tile"><div className="num">{files.length}</div><div className="lbl">Total files</div></div>
        <div className="tile"><div className="num">{readable}</div><div className="lbl">In use by the AI</div></div>
        <div className="tile"><div className="num">{fromEgnyte || files.filter((f) => f.test).length}</div><div className="lbl">{fromEgnyte ? 'From Egnyte' : 'Test files'}</div></div>
      </div>
      {anySplit && (
        <Card title="Test what the AI would read" hint="Type a question an employee might ask. This shows which sections of your long documents would be sent to the AI.">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <input type="search" className="grow" style={{ minWidth: 220 }} aria-label="Question to test" placeholder="e.g. How many bereavement days do I get?" value={question}
              onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && question.trim()) setFound(rankSections(files.filter((f) => f.sectioned), question, { budget: 20000, maxSections: 8 })) }} />
            <button className="btn" disabled={!question.trim()} onClick={() => setFound(rankSections(files.filter((f) => f.sectioned), question, { budget: 20000, maxSections: 8 }))}>Find sections</button>
          </div>
          {found && (found.length === 0
            ? <p className="small" style={{ marginTop: 10 }}><Badge tone="amber">Nothing found</Badge> No section shares words with this question, so the AI would be told nothing and the reply would go to the HR team. Check that the right document is switched on and that its headings use the words employees use.</p>
            : <>
              <p className="muted small" style={{ margin: '10px 0 6px' }}>{found.length} section{found.length === 1 ? '' : 's'}, {found.reduce((n, x) => n + x.text.length, 0).toLocaleString()} characters would be sent. Best match first.</p>
              <ol className="small" style={{ margin: '0 0 0 18px' }}>{found.map((x, i) => <li key={i} style={{ marginBottom: 6 }}><strong>{x.heading || 'Start of document'}</strong> <span className="muted">in {x.f.name}</span><div className="muted">{x.text.replace(/\s+/g, ' ').slice(0, 160)}…</div></li>)}</ol>
            </>)}
        </Card>
      )}
      <Card>
        <div className="row between" style={{ marginBottom: 12 }}>
          <select aria-label="Folder" style={{ maxWidth: 200 }} value={folder} onChange={(e) => setFolder(e.target.value)}>{folders.map((f) => <option key={f}>{f}</option>)}</select>
          <input type="search" className="grow" style={{ maxWidth: 300 }} placeholder="Search files" aria-label="Search files" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {list.length === 0 ? <Empty title="No files">Upload a policy, FAQ or guide to get started.</Empty> : (
          <div className="table-wrap">
            <table className="stack-sm">
              <thead><tr><th>Name</th><th>Folder</th><th>Size</th><th>AI can use</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {list.map((f) => (
                  <tr key={f.id}>
                    <td data-label="Name">
                      <div className="cell-title">{f.name} {f.test && <Badge tone="blue">Test</Badge>}{f.source === 'egnyte' && <Badge tone="blue">Egnyte</Badge>}{!f.extracted && <Badge tone="amber">Not readable yet</Badge>}</div>
                      <div className="muted small">{f.description || 'No description'}{f.sectioned ? ' · searched by section' : ''}</div>
                    </td>
                    <td data-label="Folder">
                      {f.source === 'egnyte' ? <span className="muted">Egnyte</span> : (
                      <select aria-label={`Folder for ${f.name}`} value={f.folder} onChange={(e) => updateFile(f.id, { folder: e.target.value })} style={{ minWidth: 110 }}>
                        {FILE_FOLDERS.map((x) => <option key={x}>{x}</option>)}
                      </select>)}
                    </td>
                    <td className="muted" data-label="Size" style={{ whiteSpace: 'nowrap' }}>{fmtSize(f.size)}</td>
                    <td data-label="AI can use"><Toggle label={`Let the AI use ${f.name}`} checked={f.active} onChange={(v) => { updateFile(f.id, { active: v }); log('file', `"${f.name}" ${v ? 'turned on' : 'turned off'} for the AI`) }} /></td>
                    <td className="actions" style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button className="btn small" onClick={() => setView(f)} disabled={!f.content}>View</button>{' '}
                      {f.source === 'egnyte' ? <span className="muted small" title="Managed by the Egnyte link in Settings">Synced</span> : <button className="btn small danger" onClick={() => setConfirm(f)}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showUpload && (
        <Modal title="Upload files" onClose={() => setShowUpload(false)}>
          <div className="field"><label htmlFor="uf">Save into folder</label>
            <select id="uf" value={folder === 'All' ? 'Policies' : folder} onChange={(e) => setFolder(e.target.value)}>{FILE_FOLDERS.map((f) => <option key={f}>{f}</option>)}</select></div>
          <Uploader folder={folder === 'All' ? 'Policies' : folder} />
          <div className="modal-actions"><button className="btn primary" onClick={() => setShowUpload(false)}>Done</button></div>
        </Modal>
      )}
      {view && (
        <Modal title={view.name} onClose={() => setView(null)} wide>
          <p className="muted small" style={{ marginBottom: 10 }}>{view.folder} · {fmtSize(view.size)}</p>
          {view.sectioned && view.sections?.length > 0 && (
            <details style={{ marginBottom: 10 }}>
              <summary className="small"><strong>{view.sections.length.toLocaleString()} sections</strong>: the AI reads only the ones that match each question</summary>
              <ol className="small" style={{ margin: '8px 0 0 18px', maxHeight: 240, overflow: 'auto' }}>{view.sections.slice(0, 300).map((x, i) => <li key={i}>{x.h || 'Start of document'}</li>)}{view.sections.length > 300 && <li className="muted">…and {(view.sections.length - 300).toLocaleString()} more</li>}</ol>
            </details>
          )}
          {view.content.length > PREVIEW_CHARS && <p className="muted small" style={{ marginBottom: 6 }}>Showing the first {PREVIEW_CHARS.toLocaleString()} of {view.content.length.toLocaleString()} characters. The AI can still use all of it.</p>}
          <div className="pre">{view.content.slice(0, PREVIEW_CHARS)}</div>
        </Modal>
      )}
      {confirm && (
        <Modal title="Delete this file?" onClose={() => setConfirm(null)}>
          <p><strong>{confirm.name}</strong> will be removed and the AI will stop using it. This cannot be undone. To keep it but stop the AI using it, turn off the switch instead.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn primary" style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }} onClick={() => { deleteFile(confirm.id); log('file', `File "${confirm.name}" deleted`); toast('File deleted'); setConfirm(null) }}>Delete</button>
          </div>
        </Modal>
      )}
    </>
  )
}
