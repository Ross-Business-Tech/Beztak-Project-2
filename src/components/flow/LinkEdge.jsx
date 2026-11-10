import { useState } from 'react'
import { BaseEdge, getSmoothStepPath, useStore, useStoreApi } from '@xyflow/react'
import { handlePoint, nodeRects, planRoutes } from '../../workflow/routing'

// Re-draw when any block moves or any connection changes.
const geometryKey = (s) => {
  let k = ''
  for (const [id, n] of s.nodeLookup) k += `${id}:${Math.round(n.internals.positionAbsolute.x)},${Math.round(n.internals.positionAbsolute.y)},${n.measured?.width | 0},${n.measured?.height | 0};`
  return k + s.edges.map((e) => `${e.id}${e.source}${e.sourceHandle}${e.target}`).join('|')
}

/** A connection line: highlights as a whole when hovered, is removed by double-clicking it, and keeps clear of other lines. */
export default function LinkEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd }) {
  const store = useStoreApi()
  useStore(geometryKey)
  const [hover, setHover] = useState(false)
  const enter = () => setHover(true)
  const leave = () => setHover(false)

  const { nodeLookup, edges } = store.getState()
  // every line must see exactly the same measurements, or two lines can both think they go first
  const geos = []
  for (const e of edges) {
    const a = handlePoint(nodeLookup, e.source, 'source', e.sourceHandle) || (e.id === id ? { x: sourceX, y: sourceY } : null)
    const b = handlePoint(nodeLookup, e.target, 'target', e.targetHandle || 'in') || (e.id === id ? { x: targetX, y: targetY } : null)
    if (a && b) geos.push({ id: e.id, sx: Math.round(a.x), sy: Math.round(a.y), tx: Math.round(b.x), ty: Math.round(b.y) })
  }
  const mine = planRoutes(geos, nodeRects(nodeLookup)).get(id) || {}
  const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 12, offset: 20, ...mine })

  return (
    <g className={`link ${hover ? 'hover' : ''}`} onMouseEnter={enter} onMouseLeave={leave}>
      <title>Double-click to remove this connection</title>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={30} />
    </g>
  )
}
