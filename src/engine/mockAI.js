// Text helpers, plus the SIMULATED stand-in drafting used when the real AI is switched off or unreachable.

import { CATEGORIES } from '../data/defaults'

const STOP = new Set('a an and are as at be but by can do does for from have how i if in is it me my of on or our so that the this to was we what when where which who will with you your am im about get just any there their they them than then also into out up'.split(' '))

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => w.length > 2 && !STOP.has(w))
}

export function matchKeywords(text, keywords) {
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

export function classify(text) {
  let best = { id: 'other', score: 0 }
  for (const c of CATEGORIES) {
    const score = matchKeywords(text, c.keywords).length
    if (score > best.score) best = { id: c.id, score }
  }
  return best
}

export function searchFiles(text, files) {
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

export function firstName(name, email) {
  const n = (name || '').trim().split(/\s+/)[0]
  return n || (email || 'there').split('@')[0]
}

export function buildDraft({ email, category, sources, settings }) {
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
export function buildSensitiveDraft({ email, flags, settings }) {
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

export function statusFromDecision(decision) {
  return { sent: 'auto_sent', review: 'pending_review', escalated: 'escalated', closed: 'discarded' }[decision]
}
