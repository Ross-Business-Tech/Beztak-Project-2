// SIMULATED AI. No real model or Zoro connection yet.
//
// `analyzeEmail` is the one place the real thing will plug in later:
//   1. pull the ticket from Zoro (MCP)            -> see the "Ticket source" step in the trace, and send the reply back the same way
//   2. ask the AI model to classify + draft       -> replace classify() / buildDraft()
//   3. keep the safety checks + send decision     -> checkFlags() / decide() stay as they are
// Everything else in the app only reads the result object this returns.

import { CATEGORIES } from '../data/defaults'

const STOP = new Set('a an and are as at be but by can do does for from have how i if in is it me my of on or our so that the this to was we what when where which who will with you your am im about get just any there their they them than then also into out up'.split(' '))

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => w.length > 2 && !STOP.has(w))
}

function matchKeywords(text, keywords) {
  const lower = ` ${text.toLowerCase()} `
  const hits = []
  for (const kw of keywords) {
    const k = kw.toLowerCase().trim()
    if (!k) continue
    // A trailing space or short stem in a keyword (e.g. "discriminat") means "starts with".
    const pattern = k.endsWith(' ') ? `\\b${esc(k.trim())}\\b` : `\\b${esc(k)}`
    if (new RegExp(pattern, 'i').test(lower)) hits.push(kw.trim())
  }
  return hits
}

/** Which flag rules does this text trigger? Also used by the "try a message" box on the Flag rules page. */
export function checkFlags(text, rules) {
  return rules
    .filter((r) => r.enabled)
    .map((r) => ({ rule: r, matched: matchKeywords(text, r.keywords) }))
    .filter((x) => x.matched.length > 0)
    .map(({ rule, matched }) => ({
      ruleId: rule.id, name: rule.name, severity: rule.severity, action: rule.action, notify: rule.notify, matched,
    }))
}

function classify(text) {
  let best = { id: 'other', score: 0 }
  for (const c of CATEGORIES) {
    const score = matchKeywords(text, c.keywords).length
    if (score > best.score) best = { id: c.id, score }
  }
  return best
}

function searchFiles(text, files) {
  const q = new Set(tokenize(text))
  const scored = []
  for (const f of files) {
    if (!f.active || !f.content) continue
    const paras = f.content.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !p.startsWith('#'))
    for (const p of paras) {
      const words = new Set(tokenize(p))
      let overlap = 0
      q.forEach((w) => { if (words.has(w)) overlap += 1 })
      if (overlap >= 2) scored.push({ fileId: f.id, name: f.name, snippet: p, score: overlap })
    }
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 2)
}

function firstName(name, email) {
  const n = (name || '').trim().split(/\s+/)[0]
  return n || (email || 'there').split('@')[0]
}

function buildDraft({ email, category, sources, settings }) {
  const first = firstName(email.name, email.from)
  const greet = {
    warm: `Hi ${first},\n\nThanks so much for reaching out!`,
    professional: `Hello ${first},\n\nThank you for contacting ${settings.helpDeskName}.`,
    concise: `Hi ${first},`,
  }[settings.tone] || `Hi ${first},`
  let body
  if (sources.length) {
    const quotes = sources.map((s) => `From ${s.name.replace(/\.[a-z]+$/i, '').replace(/-/g, ' ')}:\n"${s.snippet.replace(/\n/g, ' ')}"`).join('\n\n')
    body = `${quotes}\n\nIf you would like help with anything else, just reply to this email.`
  } else {
    const label = CATEGORIES.find((c) => c.id === category)?.label.toLowerCase() || 'question'
    body = `I want to make sure you get accurate information about your ${label} question, so I've passed it to a member of the HR team. They will follow up within one business day.`
  }
  const parts = [greet, body, settings.signature]
  if (settings.includeFooter && settings.footer) parts.push(`--\n${settings.footer}`)
  return parts.join('\n\n')
}

// High-risk situations get a careful, human-sounding draft: no policy quotes, no advice, no promises.
function buildSensitiveDraft({ email, flags, settings }) {
  const first = firstName(email.name, email.from)
  const ids = flags.map((f) => f.ruleId)
  let body
  if (ids.includes('legal') && !ids.some((i) => ['harassment', 'discrimination', 'retaliation', 'safety', 'wellbeing'].includes(i))) {
    body = `Thank you for your message. I have shared it with the right people on our team, and someone will respond to you directly. I am not able to discuss the details over email, but your message has been received and is being looked at.`
  } else {
    body = `Thank you for telling us about this. I'm sorry you are dealing with it, and I want you to know it is being taken seriously.\n\nA member of the HR team will contact you personally to talk it through in private. You do not need to do anything else right now. If you would prefer a phone call or an in-person conversation, just reply with a time that works for you.`
    if (ids.includes('wellbeing') || ids.includes('safety')) body += `\n\nIf you or anyone else is in immediate danger, please contact your local emergency number right away.`
  }
  const parts = [`Hi ${first},`, body, settings.signature]
  if (settings.includeFooter && settings.footer) parts.push(`--\n${settings.footer}`)
  return parts.join('\n\n')
}

function inHours(date, hours) {
  const mins = date.getHours() * 60 + date.getMinutes()
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  return mins >= toMin(hours.start) && mins <= toMin(hours.end)
}

/**
 * @param email    { name, from, subject, body, receivedAt }
 * @param ctx      { settings, rules, files, history }  (history = earlier emails, used for per-sender limits)
 * @param override optional mode to try in the Test Lab: 'draft' | 'auto_safe' | 'auto_all'
 */
export function analyzeEmail(email, { settings, rules, files, history = [] }, override) {
  const mode = override || settings.mode
  const text = `${email.subject}\n${email.body}`
  const trace = []

  trace.push({ step: 'Received', status: 'ok', detail: `From ${email.name || email.from} <${email.from}>` })
  trace.push({
    step: 'Ticket source (Zoro)',
    status: 'skipped',
    detail: 'Entered by hand in the Test Lab. In production this arrives as a Zoro ticket.',
  })

  const cat = classify(text)
  const catLabel = CATEGORIES.find((c) => c.id === cat.id).label
  trace.push({ step: 'Topic', status: 'ok', detail: cat.id === 'other' ? 'No clear topic found.' : `${catLabel} (${cat.score} matching word${cat.score === 1 ? '' : 's'})` })

  const flags = checkFlags(text, rules)
  trace.push({
    step: 'Safety check',
    status: flags.length ? 'flag' : 'ok',
    detail: flags.length ? `Flagged: ${flags.map((f) => f.name).join(', ')}` : 'No flag rules triggered.',
  })

  const usable = files.filter((f) => f.active && f.content)
  const sources = searchFiles(text, files)
  trace.push({
    step: 'Document search',
    status: sources.length ? 'ok' : 'warn',
    detail: sources.length ? `Used ${[...new Set(sources.map((s) => s.name))].join(', ')}` : `No answer found in ${usable.length} readable document${usable.length === 1 ? '' : 's'}.`,
  })

  let confidence = 35 + Math.min(cat.score, 3) * 6
  if (sources.length) confidence += Math.min(sources[0].score, 6) * 6
  else confidence -= 10
  confidence = Math.max(10, Math.min(97, confidence))

  const escalate = flags.some((f) => f.action === 'escalate')
  const flagged = flags.length > 0
  const draft = flagged
    ? (escalate ? buildSensitiveDraft({ email, flags, settings }) : buildDraft({ email, category: cat.id, sources, settings }))
    : buildDraft({ email, category: cat.id, sources, settings })
  trace.push({
    step: 'Draft',
    status: escalate ? 'flag' : 'ok',
    detail: escalate ? 'Wrote a careful draft for a person to rewrite and approve. It is never sent without a human.' : `Wrote a reply (${settings.tone} tone, ${confidence}% confident).`,
  })

  // ---- Decision ----
  const reasons = []
  let decision = 'review' // 'review' | 'sent' | 'escalated'
  if (escalate) {
    decision = 'escalated'
    reasons.push('High-risk: ' + flags.filter((f) => f.action === 'escalate').map((f) => f.name).join(', ') + '. A careful draft was written, but a person must review, edit and send it.')
  } else if (flagged) {
    reasons.push('Flagged for human review: ' + flags.map((f) => f.name).join(', ') + '. Flagged messages are never sent automatically.')
  } else if (mode === 'draft') {
    reasons.push('Reply mode is "Draft for review", so a person approves every reply.')
  } else {
    let ok = true
    if (mode === 'auto_safe') {
      if (settings.autoCategories[cat.id] !== true) {
        ok = false; reasons.push(`Auto-send is turned off for "${catLabel}".`)
      }
      if (confidence < settings.confidenceThreshold) {
        ok = false; reasons.push(`Confidence ${confidence}% is below the ${settings.confidenceThreshold}% needed to auto-send.`)
      }
    }
    if (settings.requireSource && !sources.length) {
      ok = false; reasons.push('No supporting document found, and the settings require one before auto-sending.')
    }
    if (settings.hours.enabled && settings.hours.outside === 'hold' && !inHours(new Date(email.receivedAt), settings.hours)) {
      ok = false; reasons.push('Received outside business hours, and the settings hold those for review.')
    }
    const dayAgo = new Date(email.receivedAt).getTime() - 864e5
    const recent = history.filter((h) => h.from === email.from && h.status === 'auto_sent' && new Date(h.receivedAt).getTime() > dayAgo).length
    if (recent >= settings.maxAutoPerSenderPerDay) {
      ok = false; reasons.push(`This sender already received ${recent} automatic replies in 24 hours (limit ${settings.maxAutoPerSenderPerDay}).`)
    }
    if (ok) { decision = 'sent'; reasons.push(mode === 'auto_all' ? 'Reply mode is "Auto-send everything safe" and nothing blocked it.' : `Passed every auto-send check (${confidence}% confident, topic allowed).`) }
  }
  trace.push({
    step: 'Decision',
    status: decision === 'sent' ? 'ok' : decision === 'escalated' ? 'flag' : 'warn',
    detail: { sent: 'Auto-send the reply', review: 'Hold the draft for a person to review', escalated: 'High-risk: draft saved for a person to edit and send' }[decision],
  })

  const ack = escalate && settings.ackOnEscalate ? settings.ackText : null

  return { category: cat.id, flags, confidence, sources, draft, decision, reasons, trace, mode, acknowledgement: ack }
}

export function statusFromDecision(decision) {
  return { sent: 'auto_sent', review: 'pending_review', escalated: 'escalated' }[decision]
}
