// Design check: finds problems and risks in the drawn workflow so the user is warned before relying on it.
import { BLOCKS, portsOf, titleOf } from './blocks'

export function validate(workflow) {
  const { nodes, edges } = workflow
  const out = []
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const from = (id, port) => edges.filter((e) => e.source === id && (port === undefined || e.sourceHandle === port))
  const warn = (level, nodeId, text) => out.push({ level, nodeId, text })

  const start = nodes.find((n) => n.data.kind === 'email_in')
  if (!start) { warn('error', null, 'There is no "Email received" block. Add one from the block list, or reset to the starter workflow.'); return out }
  if (!from(start.id).length) warn('error', start.id, 'Email received is not connected to anything, so every email will be held for a person.')

  // outputs that go nowhere
  for (const n of nodes) {
    for (const p of portsOf(n)) {
      if (!from(n.id, p.id).length && !(n.data.kind === 'email_in')) {
        warn('info', n.id, `"${titleOf(n)}"${p.label ? ` > ${p.label}` : ''} is not connected. Messages that reach it are held for a person.`)
      }
    }
  }

  // reachability, and whether every path to an automatic send passes a Risk filter
  const seen = new Set(); const reached = new Set()
  const stack = [{ id: start.id, filtered: false, viaFlag: false, drafted: false }]
  const bad = { noFilter: new Set(), viaFlag: new Set(), noDraft: new Set() }
  while (stack.length) {
    const s = stack.pop(); const key = `${s.id}|${+s.filtered}|${+s.viaFlag}|${+s.drafted}`
    if (seen.has(key)) continue
    seen.add(key); reached.add(s.id)
    const n = byId.get(s.id); if (!n) continue
    if (n.data.kind === 'email_out' && !n.data.config.requireApproval) {
      if (!s.filtered) bad.noFilter.add(n.id)
      if (s.viaFlag) bad.viaFlag.add(n.id)
      if (!s.drafted) bad.noDraft.add(n.id)
    }
    for (const e of from(n.id)) {
      stack.push({
        id: e.target,
        filtered: s.filtered || n.data.kind === 'filter_flag',
        viaFlag: s.viaFlag || (n.data.kind === 'filter_flag' && e.sourceHandle === 'flagged'),
        drafted: s.drafted || n.data.kind === 'ai_draft',
      })
    }
  }
  for (const id of bad.noFilter) warn('warn', id, 'Safety: a path reaches this automatic "Email sent" without passing any Risk filter. A sensitive message could be sent with no person involved.')
  for (const id of bad.viaFlag) warn('warn', id, 'Safety: a message that a Risk filter flagged can reach this automatic "Email sent". Flagged messages normally go to a person.')
  for (const id of bad.noDraft) warn('warn', id, 'A path reaches this "Email sent" before any reply is written. Those messages will be held for a person.')
  for (const n of nodes) if (!reached.has(n.id) && n.id !== start.id) warn('info', n.id, `"${titleOf(n)}" is not connected to the start, so it never runs.`)

  // loops
  const canReach = (a, b) => {
    const seenR = new Set(); const st = [a]
    while (st.length) { const x = st.pop(); if (x === b) return true; if (seenR.has(x)) continue; seenR.add(x); from(x).forEach((e) => st.push(e.target)) }
    return false
  }
  for (const n of nodes.filter((x) => x.data.kind === 'while')) {
    const loopEdges = from(n.id, 'loop')
    if (loopEdges.length && !loopEdges.some((e) => canReach(e.target, n.id))) warn('warn', n.id, `"${titleOf(n)}": the Repeat path never returns to this block, so it will not loop. Connect the last block of the loop back into it.`)
  }
  // AI meaning without an AI block upstream
  for (const n of nodes.filter((x) => x.data.kind === 'filter_flag' && x.data.config.semantic)) {
    const hasAI = nodes.some((x) => x.data.kind === 'ai_understand' && canReach(x.id, n.id))
    if (!hasAI) warn('warn', n.id, `"${titleOf(n)}" is set to use AI meaning, but no "Understand with AI" block comes before it. It will only check for words.`)
  }
  const order = { error: 0, warn: 1, info: 2 }
  return out.sort((a, b) => order[a.level] - order[b.level])
}

export { BLOCKS }
