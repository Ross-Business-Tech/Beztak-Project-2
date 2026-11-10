import { useState } from 'react'
import { useApp } from '../store'
import { FILE_FOLDERS } from '../data/defaults'
import { Uploader } from '../components/Uploader'
import { Badge, Card, HelpPanel, Empty, Modal, PageHeader, Toggle, fmtSize } from '../components/ui'

export default function Files() {
  const { files, updateFile, deleteFile, toast, log } = useApp()
  const [folder, setFolder] = useState('All')
  const [q, setQ] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [view, setView] = useState(null)
  const [confirm, setConfirm] = useState(null)

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
        'Use View to read a document exactly as the AI sees it. Use the folder filter and search to find files.',
        'Delete removes a file permanently, so prefer turning it off if you may need it again.',
      ]} note="Keep documents short, current and clearly written. The AI searches them paragraph by paragraph, so one topic per paragraph works best." />
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <div className="tile"><div className="num">{files.length}</div><div className="lbl">Total files</div></div>
        <div className="tile"><div className="num">{readable}</div><div className="lbl">In use by the AI</div></div>
        <div className="tile"><div className="num">{fromEgnyte || files.filter((f) => f.test).length}</div><div className="lbl">{fromEgnyte ? 'From Egnyte' : 'Test files'}</div></div>
      </div>
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
                      <div className="muted small">{f.description || 'No description'}</div>
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
          <div className="pre">{view.content}</div>
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
