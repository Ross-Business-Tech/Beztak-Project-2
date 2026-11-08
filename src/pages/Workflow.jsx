import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Background, Controls, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, applyEdgeChanges, applyNodeChanges, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useApp, uid } from '../store'
import { SCENARIOS } from '../data/defaults'
import { BLOCKS, GROUPS, PALETTE, portsOf } from '../workflow/blocks'
import { validate } from '../workflow/validate'
import BlockNode, { FlowInfo } from '../components/flow/BlockNode'
import LinkEdge from '../components/flow/LinkEdge'
import { NODE_H, NODE_W, resolveOverlap } from '../workflow/routing'
import Inspector from '../components/flow/Inspector'
import { Badge, Card, HelpPanel, Icon, Modal, PageHeader, Trace, catLabel } from '../components/ui'

const nodeTypes = { block: BlockNode }
const edgeTypes = { link: LinkEdge }
const EDGE_STYLE = { type: 'link', markerEnd: { type: MarkerType.ArrowClosed, color: '#7a8699' } }
const rectOf = (n) => ({ id: n.id, x: n.position.x, y: n.position.y, w: n.measured?.width ?? NODE_W, h: n.measured?.height ?? NODE_H })

const clean = (nodes, edges) => ({
  nodes: nodes.map((n) => ({ id: n.id, type: 'block', position: { x: Math.round(n.position.x), y: Math.round(n.position.y) }, data: n.data })),
  edges: edges.map((e) => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, targetHandle: 'in' })),
})

export default function Workflow() {
  return <ReactFlowProvider><Editor /></ReactFlowProvider>
}

function Palette({ onAdd, nodes }) {
  return (
    <div className="palette">
      {PALETTE.map((g) => (
        <div key={g.label} className="pal-group">
          <div className="nav-group-lite">{g.label}</div>
          {g.kinds.map((k) => {
            const d = BLOCKS[k]
            return (
              <button key={k} className="pal-item" draggable onClick={() => onAdd(k)}
                onDragStart={(e) => { e.dataTransfer.setData('application/x-block', k); e.dataTransfer.effectAllowed = 'move' }}>
                <span className="pal-ico" style={{ background: GROUPS[d.group].color }}><Icon name={d.icon} size={15} /></span>
                <span><strong>{d.title}</strong></span>
              </button>
            )
          })}
        </div>
      ))}
      {!nodes.some((n) => n.data.kind === 'email_in') && (
        <button className="pal-item" onClick={() => onAdd('email_in')}><span className="pal-ico" style={{ background: GROUPS.start.color }}><Icon name="mail" size={15} /></span><strong>Email received</strong></button>
      )}
    </div>
  )
}

function Editor() {
  const { workflow, setWorkflow, resetWorkflow, sendTestEmail, toast } = useApp()
  const rf = useReactFlow()
  const wrap = useRef(null)
  const [nodes, setNodes] = useState(workflow.nodes)
  const [edges, setEdges] = useState(workflow.edges)
  const nodesRef = useRef(nodes); const edgesRef = useRef(edges)
  const [selectedId, setSelectedId] = useState(null)
  const [showChecks, setShowChecks] = useState(false)
  const [showTest, setShowTest] = useState(false)
  const [palOpen, setPalOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [lastRun, setLastRun] = useState(null)
  const [scenario, setScenario] = useState('s_harass')
  const [running, setRunning] = useState(false)

  // Keep the editor in step if the workflow is replaced from outside (Reset).
  const lastStored = useRef(workflow)
  useEffect(() => {
    if (workflow !== lastStored.current) { setNodes(workflow.nodes); setEdges(workflow.edges); nodesRef.current = workflow.nodes; edgesRef.current = workflow.edges; setSelectedId(null); setLastRun(null) }
  }, [workflow])

  const commit = useCallback((n, e) => {
    nodesRef.current = n; edgesRef.current = e
    setNodes(n); setEdges(e)
    const c = clean(n, e)
    lastStored.current = c
    setWorkflow(c)
  }, [setWorkflow])

  const warnings = useMemo(() => validate({ nodes, edges }), [nodes, edges])
  const warned = useMemo(() => {
    const m = new Map()
    for (const w of warnings) if (w.nodeId && w.level !== 'info') m.set(w.nodeId, m.get(w.nodeId) === 'error' ? 'error' : w.level)
    return m
  }, [warnings])
  const visited = useMemo(() => {
    const m = new Map()
    ;(lastRun?.result.path || []).forEach((id, i) => m.set(id, [...(m.get(id) || []), i + 1]))
    return m
  }, [lastRun])
  const ranEdges = useMemo(() => {
    const set = new Set(); const p = lastRun?.result.path || []
    for (let i = 0; i < p.length - 1; i++) set.add(`${p[i]}>${p[i + 1]}`)
    return set
  }, [lastRun])

  const shownNodes = useMemo(() => nodes.map((n) => ({ ...n, deletable: !BLOCKS[n.data.kind].undeletable })), [nodes])
  const shownEdges = useMemo(() => edges.map((e) => ({
    ...e, ...EDGE_STYLE, animated: ranEdges.has(`${e.source}>${e.target}`),
    className: ranEdges.has(`${e.source}>${e.target}`) ? 'edge-ran' : '',
  })), [edges, ranEdges])

  const onNodesChange = useCallback((changes) => {
    const allowed = changes.filter((c) => !(c.type === 'remove' && BLOCKS[nodesRef.current.find((n) => n.id === c.id)?.data.kind]?.undeletable))
    let next = applyNodeChanges(allowed, nodesRef.current)
    // when a block is dropped, nudge it off any block it landed on (overlapping blocks would hide their connections)
    const dropped = allowed.filter((c) => c.type === 'position' && c.dragging === false).map((c) => c.id)
    if (dropped.length) {
      for (const id of dropped) {
        const n = next.find((x) => x.id === id)
        if (!n) continue
        const p = resolveOverlap(rectOf(n), next.map(rectOf))
        next = next.map((x) => (x.id === id ? { ...x, position: p } : x))
      }
    }
    nodesRef.current = next; setNodes(next)
    if (dropped.length || allowed.some((c) => c.type === 'remove')) commit(next, edgesRef.current)
  }, [commit])
  const onEdgesChange = useCallback((changes) => {
    const next = applyEdgeChanges(changes, edgesRef.current)
    edgesRef.current = next; setEdges(next)
    if (changes.some((c) => c.type === 'remove')) commit(nodesRef.current, next)
  }, [commit])
  const onConnect = useCallback((c) => {
    // one connection per output: a new one replaces the old
    const kept = edgesRef.current.filter((e) => !(e.source === c.source && e.sourceHandle === c.sourceHandle))
    commit(nodesRef.current, [...kept, { id: uid('e'), source: c.source, sourceHandle: c.sourceHandle, target: c.target, targetHandle: 'in' }])
  }, [commit])
  // no block to itself, and no second copy of a connection that already exists
  const isValidConnection = useCallback((c) => c.source !== c.target
    && !edgesRef.current.some((e) => e.source === c.source && e.sourceHandle === c.sourceHandle && e.target === c.target), [])
  // drag the end of an existing line onto a different block or exit to move it
  const onReconnect = useCallback((old, c) => {
    const kept = edgesRef.current.filter((e) => e.id !== old.id && !(e.source === c.source && e.sourceHandle === c.sourceHandle))
    commit(nodesRef.current, [...kept, { id: old.id, source: c.source, sourceHandle: c.sourceHandle, target: c.target, targetHandle: 'in' }])
  }, [commit])
  const disconnectAll = useCallback((id) => {
    commit(nodesRef.current, edgesRef.current.filter((e) => e.source !== id && e.target !== id))
    toast('All connections to this block were removed.')
  }, [commit, toast])

  const addBlock = useCallback((kind, at) => {
    const def = BLOCKS[kind]
    if (def.singleton && nodesRef.current.some((n) => n.data.kind === kind)) { toast('There can only be one of those.', 'warn'); return }
    let pos = at
    if (!pos) {
      const r = wrap.current.getBoundingClientRect()
      const c = rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
      pos = { x: c.x - 110 + (nodesRef.current.length % 5) * 18, y: c.y - 40 + (nodesRef.current.length % 5) * 18 }
    }
    pos = resolveOverlap({ id: 'new', x: pos.x, y: pos.y, w: NODE_W, h: NODE_H }, nodesRef.current.map(rectOf))
    const node = { id: uid('n'), type: 'block', position: pos, data: { kind, label: '', config: def.defaults() } }
    commit([...nodesRef.current, node], edgesRef.current)
    setSelectedId(node.id); setPalOpen(false)
  }, [commit, rf, toast])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const kind = e.dataTransfer.getData('application/x-block')
    if (kind) addBlock(kind, rf.screenToFlowPosition({ x: e.clientX - 90, y: e.clientY - 30 }))
  }, [addBlock, rf])

  const updateNode = useCallback((id, patch) => {
    const n = nodesRef.current.map((x) => (x.id === id ? { ...x, data: { ...x.data, ...patch } } : x))
    const node = n.find((x) => x.id === id)
    const valid = new Set(portsOf(node).map((p) => p.id))
    const e = edgesRef.current.filter((x) => x.source !== id || valid.has(x.sourceHandle))
    commit(n, e)
  }, [commit])
  const deleteNode = useCallback((id) => { rf.deleteElements({ nodes: [{ id }] }); setSelectedId(null) }, [rf])

  const selected = nodes.find((n) => n.id === selectedId)
  const counts = { error: warnings.filter((w) => w.level === 'error').length, warn: warnings.filter((w) => w.level === 'warn').length, info: warnings.filter((w) => w.level === 'info').length }

  async function runTest() {
    const sc = SCENARIOS.find((s) => s.id === scenario)
    setRunning(true)
    try {
      const email = await sendTestEmail({ name: sc.name, from: sc.from, subject: sc.subject, body: sc.body })
      setLastRun(email)
    } finally { setRunning(false) }
  }

  return (
    <>
      <PageHeader title="Workflow" subtitle="Design how every email is handled. Drag blocks onto the canvas and connect them.">
        <button className="btn" onClick={() => setPalOpen(true)} id="add-block-mobile"><Icon name="plus" size={16} /> Add block</button>
        <button className="btn" onClick={() => { setShowChecks((v) => !v); setShowTest(false) }}>
          Design check {counts.error + counts.warn > 0 ? <Badge tone={counts.error ? 'red' : 'amber'}>{counts.error + counts.warn}</Badge> : <Badge tone="green">OK</Badge>}
        </button>
        <button className="btn primary" onClick={() => { setShowTest((v) => !v); setShowChecks(false) }}>Test this workflow</button>
        <button className="btn" onClick={() => rf.fitView({ padding: 0.15, duration: 300 })}>Fit to screen</button>
        <button className="btn danger" onClick={() => setConfirmReset(true)}>Reset</button>
      </PageHeader>

      <HelpPanel id="workflow" defaultOpen={false} title="How the workflow editor works (steps)" steps={[
        'Every email enters at Email received on the left and follows the connectors you draw. Add blocks from the list on the left: drag one onto the canvas, or select it to place it in the middle.',
        'Connect blocks by dragging from a small circle on the right of one block to the left edge of another. Blocks with several exits (Flagged and Clear, Yes and No) need each exit connected.',
        'To remove a connection, double-click the line (it lights up when you hover over it), or select it and press Delete. To change where a line goes, drag its end to another block. You can also build with blocks left unconnected and join them later. Unconnected paths are simply held for a person.',
        'Lines keep themselves apart so they do not run on top of each other, and blocks nudge apart if you drop one on another.',
        'Select a block to change its settings in the panel on the right. Each panel starts with a plain explanation of what the block does.',
        'Finish every path at an end block: Email sent, Review queue, Escalate, or Close. Anything left unconnected is held for a person, never lost.',
        'Use Test this workflow to run an example email through your design. The path it took lights up, and the Design check lists mistakes and risks.',
      ]} note="Changes save automatically. This design replaces the old Settings and Flag rules pages: the reply mode is the Email sent block, and flag rules live inside Risk filters." />

      <p className="wf-hint"><strong>Drag</strong> a block from the list onto the canvas. <strong>Connect</strong> the circles. <strong>Select</strong> a block to edit it. <strong>Hover</strong> over a line to light it up, and <strong>double-click</strong> it to remove it. Scroll or pinch to zoom, drag the background to move around.</p>

      {showChecks && (
        <Card title="Design check" hint="Problems and risks in your current design." className="wf-panel">
          {warnings.length === 0 ? <p>No problems found. Every path ends somewhere and no automatic send bypasses a risk check.</p> : (
            <ul className="checks">
              {warnings.map((w, i) => (
                <li key={i} className={w.level}>
                  <Badge tone={{ error: 'red', warn: 'amber', info: 'gray' }[w.level]}>{{ error: 'Fix', warn: 'Risk', info: 'Note' }[w.level]}</Badge>
                  <span>{w.text}</span>
                  {w.nodeId && <button className="btn small" onClick={() => { setSelectedId(w.nodeId); rf.fitView({ nodes: [{ id: w.nodeId }], padding: 1.5, duration: 300 }) }}>Show block</button>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {showTest && (
        <Card title="Test this workflow" hint="Runs an example email through your design. It is also saved in Test emails." className="wf-panel">
          <div className="row">
            <select aria-label="Example email" value={scenario} onChange={(e) => setScenario(e.target.value)} className="grow" style={{ maxWidth: 360 }}>
              {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button className="btn primary" disabled={running} onClick={runTest}>{running ? 'Running...' : 'Run'}</button>
            {lastRun && <button className="btn" onClick={() => setLastRun(null)}>Clear highlight</button>}
          </div>
          {lastRun && (
            <div style={{ marginTop: 14 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <Badge tone={{ sent: 'green', review: 'amber', escalated: 'red', closed: 'gray' }[lastRun.result.decision]}>{{ sent: 'Sent automatically', review: 'Sent to review queue', escalated: 'Escalated', closed: 'Closed' }[lastRun.result.decision]}</Badge>
                <span className="muted small">Topic: {catLabel(lastRun.result.category)} · {lastRun.result.engine === 'ai' ? `AI: ${lastRun.result.model}` : 'simulated engine'}</span>
                <a className="btn small" href="#/admin/review">Open in review queue</a>
              </div>
              {lastRun.result.aiFallback && <p className="muted small" style={{ marginBottom: 8 }}>The real AI was not used: {lastRun.result.aiFallback}</p>}
              <p className="muted small" style={{ marginBottom: 8 }}>The blocks that ran are numbered on the canvas.</p>
              <Trace trace={lastRun.result.trace} />
            </div>
          )}
        </Card>
      )}

      <div className="wf-layout">
        <div className="wf-palette-col"><Palette onAdd={addBlock} nodes={nodes} /></div>
        <div className="wf-canvas" ref={wrap} onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}>
          <FlowInfo.Provider value={{ visited, warned }}>
            <ReactFlow
              nodes={shownNodes} edges={shownEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onReconnect={onReconnect}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} isValidConnection={isValidConnection}
              onEdgeDoubleClick={(_, e) => { rf.deleteElements({ edges: [{ id: e.id }] }); toast('Connection removed.') }} zoomOnDoubleClick={false} onNodeClick={(_, n) => setSelectedId(n.id)} onPaneClick={() => setSelectedId(null)}
              defaultViewport={{ x: 24, y: 70, zoom: 0.72 }} minZoom={0.2} maxZoom={1.5} deleteKeyCode={['Backspace', 'Delete']}
              colorMode="system" proOptions={{ hideAttribution: true }} connectionRadius={28}
            >
              <Background gap={20} />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable nodeColor={(n) => GROUPS[BLOCKS[n.data.kind].group].color} maskColor="rgba(0,0,0,.08)" />
            </ReactFlow>
          </FlowInfo.Provider>
        </div>
        {selected && <Inspector node={selected} onChange={updateNode} onDelete={deleteNode} onClose={() => setSelectedId(null)} connections={edges.filter((e) => e.source === selected.id || e.target === selected.id).length} onDisconnect={disconnectAll} />}
      </div>

      {palOpen && (
        <Modal title="Add a block" onClose={() => setPalOpen(false)}>
          <p className="muted small" style={{ marginBottom: 10 }}>Select a block to place it on the canvas, then connect it.</p>
          <Palette onAdd={addBlock} nodes={nodes} />
        </Modal>
      )}
      {confirmReset && (
        <Modal title="Reset the workflow?" onClose={() => setConfirmReset(false)}>
          <p>This replaces your design with the starter workflow. Your Knowledge files, emails and settings are not affected.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button className="btn primary" style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }} onClick={() => { resetWorkflow(); setConfirmReset(false); toast('Workflow reset') }}>Reset</button>
          </div>
        </Modal>
      )}
    </>
  )
}
