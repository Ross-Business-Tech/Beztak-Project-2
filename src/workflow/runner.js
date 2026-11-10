// Runs one email through the workflow the user drew, block by block.
//
// `execute` is a generator. Whenever a block needs the AI it yields a request; a driver answers it
// with the real AI (runWorkflow) or the simulated stand-in (runWorkflowSync, also the fallback).
// Everything that decides where the email goes (filters, conditions, loops, endpoints) is plain
// code in this file. The AI only reads and drafts. It never chooses a route.

import { CATEGORIES } from '../data/defaults'
import { buildDraft, buildSensitiveDraft, checkFlags, classify, matchKeywords, searchFiles } from '../engine/mockAI'
import { aiDraft, aiUnderstand } from '../engine/ai'
import { BLOCKS, FIELDS, RISK_LEVELS, describeCondition, portsOf, titleOf } from './blocks'

const MAX_STEPS = 60
const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || 'Other'

// ---------------- conditions ----------------
function fieldValue(field, ctx, env) {
  const e = ctx.email
  switch (field) {
    case 'confidence': return ctx.confidence ?? 0
    case 'topic': return ctx.category
    case 'riskLevel': return RISK_LEVELS[Math.max(0, ...ctx.flags.map((f) => RISK_LEVELS.indexOf(f.severity === 'medium' ? 'medium' : f.severity)))] || 'none'
    case 'flagged': return ctx.flags.length ? 'yes' : 'no'
    case 'flaggedRule': return ctx.flags.map((f) => f.name).join(', ')
    case 'sourcesFound': return ctx.sources.length ? 'yes' : 'no'
    case 'senderEmail': return e.from || ''
    case 'senderDomain': return (e.from || '').split('@')[1] || ''
    case 'subject': return e.subject || ''
    case 'body': return e.body || ''
    case 'hour': return new Date(e.receivedAt).getHours()
    case 'tries': return ctx.tries
    case 'repliesToSender': {
      const since = new Date(e.receivedAt).getTime() - 864e5
      return env.history.filter((h) => h.from === e.from && h.status === 'auto_sent' && new Date(h.receivedAt).getTime() > since).length
    }
    default: return ''
  }
}

function evalCondition(c, ctx, env) {
  const f = FIELDS[c.field]
  if (!f) return false
  const actual = fieldValue(c.field, ctx, env)
  const want = c.value
  switch (f.type) {
    case 'number': {
      const a = Number(actual); const w = Number(want)
      return { '=': a === w, '!=': a !== w, '>': a > w, '>=': a >= w, '<': a < w, '<=': a <= w }[c.op] ?? false
    }
    case 'text': {
      const a = String(actual).toLowerCase(); const w = String(want).toLowerCase()
      return { contains: a.includes(w), not_contains: !a.includes(w), is: a === w, starts: a.startsWith(w) }[c.op] ?? false
    }
    case 'topic': return c.op === 'in' ? (Array.isArray(want) ? want : [want]).includes(actual) : c.op === 'is_not' ? actual !== want : actual === want
    case 'risk': return c.op === 'at_least' ? RISK_LEVELS.indexOf(actual) >= RISK_LEVELS.indexOf(want) : c.op === 'is_not' ? actual !== want : actual === want
    default: return actual === want
  }
}

function evalConditions(config, ctx, env) {
  const results = config.conditions.map((c) => evalCondition(c, ctx, env))
  const ok = config.conditions.length === 0 ? false : config.join === 'any' ? results.some(Boolean) : results.every(Boolean)
  const detail = config.conditions.map((c, i) => `${describeCondition(c)}: ${results[i] ? 'true' : 'false'}`).join('; ')
  return { ok, detail }
}

function absorbAnswer(ctx, res) {
  if (res.engine === 'ai') { ctx.usedAI = true; ctx.model = res.model }
  if (res.note) ctx.aiFallback = res.note
}

// ---------------- block behaviour ----------------
const RUN = {
  *email_in(node, ctx) {
    return { port: 'out', detail: `From ${ctx.email.name || ctx.email.from} <${ctx.email.from}>` }
  },

  *ai_understand(node, ctx, env) {
    const res = yield { need: 'understand', ctx, rules: env.semanticRules }
    absorbAnswer(ctx, res)
    ctx.category = res.data.category
    ctx.certainty = res.data.certainty ?? null
    ctx.understood = res.data
    const who = res.engine === 'ai' ? `AI, ${res.model}` : 'simulated word matching'
    return { port: 'out', detail: `Topic: ${catLabel(ctx.category)} (${who})${res.note ? `. ${res.note} Used word matching instead.` : ''}`, status: res.note ? 'warn' : 'ok' }
  },

  *filter_flag(node, ctx) {
    const c = node.data.config
    const rules = c.rules.map((r) => ({ ...r, enabled: true }))
    const found = new Map()
    for (const f of checkFlags(`${ctx.email.subject}\n${ctx.email.body}`, rules)) found.set(f.ruleId, { ...f, reason: '', by: 'words' })
    let note = ''
    if (c.semantic) {
      if (!ctx.understood) note = ' (no "Understand with AI" block ran first, so only words were checked)'
      else for (const f of ctx.understood.flags || []) {
        const r = c.rules.find((x) => x.id === f.ruleId)
        if (!r) continue
        const prev = found.get(r.id)
        found.set(r.id, prev ? { ...prev, reason: f.reason || '', by: 'both' } : { ruleId: r.id, name: r.name, severity: r.severity, notify: r.notify, matched: [], reason: f.reason || '', by: 'ai' })
      }
    }
    const hits = [...found.values()]
    for (const h of hits) { if (!ctx.flags.some((x) => x.ruleId === h.ruleId)) ctx.flags.push(h) }
    if (hits.length) {
      if (c.careful) ctx.careful = true
      const byMeaning = hits.filter((h) => h.by === 'ai').length
      return { port: 'flagged', status: 'flag', detail: `Flagged: ${hits.map((h) => h.name).join(', ')}${byMeaning ? `. ${byMeaning} caught by meaning, with no trigger word.` : ''}${c.careful ? ' A careful reply will be written.' : ''}` }
    }
    return { port: 'clear', detail: `Nothing in this filter matched${note}.` }
  },

  *filter_text(node, ctx) {
    const c = node.data.config
    const e = ctx.email
    const hay = c.where === 'subject' ? e.subject : c.where === 'body' ? e.body : c.where === 'sender' ? e.from : `${e.subject}\n${e.body}`
    const hits = matchKeywords(hay, c.words)
    const ok = c.words.length > 0 && (c.mode === 'all' ? hits.length === c.words.length : hits.length > 0)
    return { port: ok ? 'match' : 'nomatch', detail: ok ? `Found: ${hits.join(', ')}` : 'Words not found' }
  },

  *if(node, ctx, env) {
    const r = evalConditions(node.data.config, ctx, env)
    return { port: r.ok ? 'yes' : 'no', detail: `${r.ok ? 'Yes' : 'No'}. ${r.detail}` }
  },

  *while(node, ctx, env) {
    const c = node.data.config
    const used = ctx.loops[node.id] || 0
    const r = evalConditions(c, ctx, env)
    if (r.ok && used < c.maxLoops) {
      ctx.loops[node.id] = used + 1
      return { port: 'loop', detail: `Repeat ${used + 1} of ${c.maxLoops}. ${r.detail}` }
    }
    return { port: 'done', detail: r.ok ? `Reached the maximum of ${c.maxLoops} repeats.` : `Condition is no longer true. ${r.detail}` }
  },

  *switch_topic(node, ctx) {
    const hit = node.data.config.topics.includes(ctx.category)
    return { port: hit ? `topic:${ctx.category}` : 'else', detail: `Topic is ${catLabel(ctx.category)}${hit ? '' : ', which has no path of its own'}` }
  },

  *ai_draft(node, ctx, env) {
    const res = yield { need: 'draft', ctx, tone: node.data.config.tone === 'default' ? env.settings.tone : node.data.config.tone, node }
    absorbAnswer(ctx, res)
    ctx.tries += 1
    ctx.draft = res.data.draft
    ctx.draftBody = res.data.draft
    ctx.sources = res.data.sources
    ctx.confidence = res.data.confidence
    const how = res.engine === 'ai' ? `AI, ${res.model}` : 'simulated'
    return {
      port: 'out', status: ctx.careful ? 'flag' : res.note ? 'warn' : 'ok',
      detail: `${ctx.careful ? 'Wrote a careful, no-advice reply' : `Wrote a reply (${res.data.sources.length} quoted source${res.data.sources.length === 1 ? '' : 's'}, ${ctx.confidence}% confident)`} (${how})${res.data.droppedQuotes ? `. ${res.data.droppedQuotes} unverifiable quote(s) removed.` : ''}${res.note ? `. ${res.note} Used the simulated writer instead.` : ''}`,
    }
  },

  *alert(node, ctx) {
    const c = node.data.config
    ctx.alerts.push({ role: c.role, message: c.message })
    return { port: 'out', detail: `Alert to ${c.role}: ${c.message}` }
  },

  // Ticket blocks only RECORD what they would do in Zoho Desk until the connection exists.
  *ticket_status(node, ctx) {
    const s = node.data.config.status
    ctx.ticketActions.push({ type: 'status', value: s })
    return { port: 'out', detail: `Ticket status "${s}" in Zoho Desk (applied to real tickets; test emails only record it).` }
  },

  *ticket_tag(node, ctx) {
    const c = node.data.config
    const tags = [...(c.fromRisks ? ctx.flags.map((f) => f.name) : []), ...c.tags]
    const unique = [...new Set(tags)]
    ctx.ticketActions.push({ type: 'tags', value: unique })
    return { port: 'out', detail: unique.length ? `Ticket would be tagged: ${unique.join(', ')} (applied to real tickets; test emails only record it).` : 'No tags to add (nothing was flagged).' }
  },

  *ticket_assign(node, ctx) {
    ctx.ticketActions.push({ type: 'assign', value: node.data.config.assignee })
    return { port: 'out', detail: `Ticket assignment to ${node.data.config.assignee} (applied to real tickets; test emails only record it).` }
  },

  *email_out(node, ctx) {
    if (!ctx.draft) return { end: 'review', status: 'warn', reason: 'An Email sent block was reached before any reply was written, so it was held for a person.' }
    if (node.data.config.requireApproval || ctx.careful) {
      return { end: 'review', requireConfirm: ctx.careful, ready: true, reason: ctx.careful ? 'This is a careful, high-risk reply, so a person must approve it before it is sent.' : 'The reply is ready. The Email sent block requires a person to approve it first.' }
    }
    return { end: 'sent', reason: 'The workflow reached Email sent, which sends automatically.' }
  },

  *review(node, ctx) {
    const c = node.data.config
    return { end: 'review', priority: c.priority, requireConfirm: c.requireConfirm || ctx.careful, reason: ctx.flags.length ? `Sent to the review queue after being flagged: ${ctx.flags.map((f) => f.name).join(', ')}.` : 'Sent to the review queue for a person to look at.' }
  },

  *assign(node, ctx) {
    const c = node.data.config
    return { end: 'escalated', priority: c.priority, owner: c.owner, requireConfirm: c.requireConfirm || ctx.careful, reason: `Escalated to ${c.owner}.` }
  },

  *close(node) {
    return { end: 'closed', reason: node.data.config.reason || 'Closed without a reply.' }
  },
}

// ---------------- the walk ----------------
export function* execute({ email, workflow, settings, history = [] }) {
  const text = `${email.subject}\n${email.body}`
  const cls = classify(text)
  const ctx = {
    email, category: cls.id, catScore: cls.score, certainty: null, understood: null, flags: [], careful: false,
    sources: [], draft: null, draftBody: null, confidence: null, tries: 0, loops: {}, alerts: [], ticketActions: [],
    usedAI: false, model: null, aiFallback: null,
  }
  const env = {
    settings, history,
    semanticRules: workflow.nodes.filter((n) => n.data.kind === 'filter_flag' && n.data.config.semantic).flatMap((n) => n.data.config.rules),
  }
  const byId = new Map(workflow.nodes.map((n) => [n.id, n]))
  const next = (id, port) => workflow.edges.find((e) => e.source === id && e.sourceHandle === port)
  const trace = []
  const path = []

  let node = workflow.nodes.find((n) => n.data.kind === 'email_in')
  let end = null
  if (!node) end = { end: 'review', reason: 'The workflow has no "Email received" block, so the message was held for a person.' }

  let steps = 0
  while (node && !end) {
    if (++steps > MAX_STEPS) { end = { end: 'review', reason: `The workflow ran more than ${MAX_STEPS} steps (a possible endless loop), so the message was held for a person.` }; break }
    path.push(node.id)
    const out = yield* RUN[node.data.kind](node, ctx, env)
    const step = titleOf(node)
    if (out.end) {
      trace.push({ step, status: out.status || (out.end === 'sent' ? 'ok' : 'warn'), detail: out.reason })
      end = out
      break
    }
    trace.push({ step, status: out.status || 'ok', detail: out.detail })
    const e = next(node.id, out.port)
    const label = portsOf(node).find((p) => p.id === out.port)?.label
    if (!e || !byId.has(e.target)) {
      end = { end: 'review', status: 'warn', reason: `Nothing is connected after "${step}"${label ? ` (${label})` : ''}, so the message was held for a person.` }
      trace.push({ step: 'Nothing connected', status: 'warn', detail: end.reason })
      break
    }
    node = byId.get(e.target)
  }

  const decision = end.end
  const reasons = [end.reason]
  if (ctx.flags.length && decision !== 'sent') reasons.push(`Flagged: ${ctx.flags.map((f) => f.name).join(', ')}.`)
  return {
    category: ctx.category, flags: ctx.flags, confidence: ctx.confidence ?? ctx.certainty ?? 0,
    sources: ctx.sources, draft: ctx.draft || '', decision, reasons, trace, path,
    requireConfirm: Boolean(end.requireConfirm), priority: end.priority || (ctx.careful ? 'urgent' : 'normal'), owner: end.owner || null,
    ready: Boolean(end.ready), alerts: ctx.alerts, ticketActions: ctx.ticketActions, careful: ctx.careful,
    engine: ctx.usedAI ? 'ai' : 'simulated', model: ctx.model, aiFallback: ctx.aiFallback,
  }
}

// ---------------- drivers ----------------
function simulate(req, { email, settings, files }) {
  const text = `${email.subject}\n${email.body}`
  if (req.need === 'understand') {
    const c = classify(text)
    return { data: { category: c.id, catScore: c.score, flags: [], certainty: Math.min(95, 40 + c.score * 8) }, engine: 'simulated' }
  }
  const { ctx } = req
  const sources = searchFiles(text, files)
  const s = { ...settings, tone: req.tone }
  const draft = ctx.careful ? buildSensitiveDraft({ email, flags: ctx.flags, settings: s }) : buildDraft({ email, category: ctx.category, sources, settings: s })
  let confidence = 35 + Math.min(ctx.catScore || 0, 3) * 6
  confidence += sources.length ? Math.min(sources[0].score, 6) * 6 : -10
  confidence = Math.max(10, Math.min(97, confidence))
  return { data: { draft, sources: ctx.careful ? [] : sources, confidence }, engine: 'simulated' }
}

async function viaAI(req, input) {
  const model = (input.settings.ai?.model || '').trim() || undefined
  if (req.need === 'understand') {
    const data = await aiUnderstand({ email: input.email, settings: input.settings, rules: req.rules, model })
    return { data, engine: 'ai', model: model || 'default model' }
  }
  const data = await aiDraft({ email: input.email, settings: input.settings, files: input.files, ctx: req.ctx, tone: req.tone, model })
  return { data, engine: 'ai', model: model || 'default model' }
}

/** Run with the simulated stand-in only (instant). Used for sample data. */
export function runWorkflowSync(input) {
  const gen = execute(input)
  let step = gen.next()
  while (!step.done) step = gen.next(simulate(step.value, input))
  return step.value
}

/** Run with the real AI when it is switched on. If it fails, fall back to the stand-in and say so. */
export async function runWorkflow(input) {
  const gen = execute(input)
  const useAI = input.settings.ai?.engine === 'ai'
  let down = null
  let step = gen.next()
  while (!step.done) {
    let res = null
    if (useAI && !down) {
      try { res = await viaAI(step.value, input) } catch (e) { down = e?.message || 'The AI could not be reached.' }
    }
    if (!res) res = { ...simulate(step.value, input), note: useAI ? down : undefined }
    step = gen.next(res)
  }
  return step.value
}

export { BLOCKS }
