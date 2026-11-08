// Keeps connection lines readable: spreads parallel lines apart, routes loop-backs around the blocks,
// and nudges blocks apart so they never sit on top of each other.

export const NODE_W = 236
export const NODE_H = 130

export function nodeRects(nodeLookup) {
  const out = []
  for (const [id, n] of nodeLookup) {
    const p = n.internals.positionAbsolute
    out.push({ id, x: p.x, y: p.y, w: n.measured?.width ?? NODE_W, h: n.measured?.height ?? NODE_H })
  }
  return out
}

/** Where a connection point (handle) is on the canvas, from the library's measured handle bounds. */
export function handlePoint(nodeLookup, nodeId, type, handleId) {
  const n = nodeLookup.get(nodeId)
  const hb = n?.internals.handleBounds?.[type]?.find((h) => h.id === handleId)
  if (!n || !hb) return null
  const p = n.internals.positionAbsolute
  return { x: p.x + hb.x + hb.width / 2, y: p.y + hb.y + hb.height / 2 }
}

/**
 * Decide the route of every line at once so that no two lines run along each other.
 * geos: [{ id, sx, sy, tx, ty }]. Returns Map(id -> { centerX } | { centerY, offset }).
 */
export function planRoutes(geos, rects) {
  const plan = new Map()
  const verticals = []  // forward lines: where their vertical stretch runs
  const loops = []      // loop-back lines: the height they run at
  const sorted = [...geos].sort((a, b) => a.sx - b.sx || (a.id < b.id ? -1 : 1))
  for (const g of sorted) {
    const yLo = Math.min(g.sy, g.ty); const yHi = Math.max(g.sy, g.ty)
    if (g.tx - g.sx > 30) {
      // a normal left-to-right line: place its vertical stretch in the gap between the blocks, away from other lines
      const lo = g.sx + 10; const hi = g.tx - 10
      const base = (g.sx + g.tx) / 2
      const free = (x) => x >= lo && x <= hi
        && !verticals.some((v) => Math.abs(v.x - x) < 13 && v.lo < yHi + 4 && yLo - 4 < v.hi)
        && !rects.some((r) => x > r.x - 8 && x < r.x + r.w + 8 && r.y < yHi + 4 && yLo - 4 < r.y + r.h)
      let chosen = base
      for (let k = 0; k < 8; k++) {
        const c = k === 0 ? [base] : [base - 13 * k, base + 13 * k]
        const hit = c.find(free)
        if (hit !== undefined) { chosen = hit; break }
      }
      verticals.push({ x: chosen, lo: yLo, hi: yHi })
      plan.set(g.id, { centerX: chosen, offset: 10 })
    } else {
      // a line that goes back to an earlier block (a loop): run it at the nearest height where it crosses no block
      const stub = 28
      const xl = g.tx - stub; const xr = g.sx + stub
      const blocked = (y) => rects.some((r) => r.x < xr + 10 && r.x + r.w > xl - 10 && y > r.y - 16 && y < r.y + r.h + 16)
        || loops.some((l) => l.xl < xr && xl < l.xr && Math.abs(l.y - y) < 16)
      const above = yLo - 56; const below = yHi + 56
      let y = above
      for (let k = 0; k < 40; k++) {
        if (!blocked(above - 18 * k)) { y = above - 18 * k; break }
        if (!blocked(below + 18 * k)) { y = below + 18 * k; break }
      }
      loops.push({ xl, xr, y })
      plan.set(g.id, { centerY: y, offset: stub })
    }
  }
  return plan
}

/** Move a block the shortest distance so it no longer overlaps any other block. */
export function resolveOverlap(rect, others, gap = 28) {
  let { x, y } = rect
  const { w, h } = rect
  for (let i = 0; i < 25; i++) {
    const hit = others.find((o) => o.id !== rect.id && x < o.x + o.w + gap && x + w + gap > o.x && y < o.y + o.h + gap && y + h + gap > o.y)
    if (!hit) break
    const right = hit.x + hit.w + gap - x; const left = x + w + gap - hit.x
    const down = hit.y + hit.h + gap - y; const up = y + h + gap - hit.y
    const m = Math.min(right, left, down, up)
    if (m === down) y += down
    else if (m === up) y -= up
    else if (m === right) x += right
    else x -= left
  }
  return { x, y }
}
