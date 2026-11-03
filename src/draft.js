import { HANDBOOK } from './handbook.js'

// DEMO drafting engine: finds the handbook sections that best match the ticket and
// assembles a reply from them. A real version would send the ticket + matched sections
// to an AI model and ask it to write the reply, citing the sections.
const SENSITIVE = ['harass', 'discriminat', 'retaliat', 'uncomfortable', 'hostile', 'lawsuit', 'fired', 'terminat', 'unsafe', 'bully']

function score(ticket, sec) {
  const hay = (ticket.subject + ' ' + ticket.body).toLowerCase()
  return sec.keywords.reduce((n, k) => n + (hay.includes(k) ? 1 : 0), 0)
}

function firstName(name) { return name.split(' ')[0] }

export function draftReply(ticket) {
  const hay = (ticket.subject + ' ' + ticket.body).toLowerCase()
  const sensitive = SENSITIVE.some((w) => hay.includes(w))
  const matches = HANDBOOK.map((s) => ({ s, n: score(ticket, s) }))
    .filter((m) => m.n > 0).sort((a, b) => b.n - a.n).slice(0, 2).map((m) => m.s)
  if (sensitive) matches.unshift(HANDBOOK.find((s) => s.id === 'harassment'))
  const unique = [...new Set(matches)].slice(0, 2)

  if (unique.length === 0) {
    return { text: `Hi ${firstName(ticket.from)},\n\nThanks for reaching out. I couldn't find this covered in the employee handbook, so I'm passing your question to a member of the HR team who will follow up personally.\n\nBest,\nBeztak HR`, citations: [], confidence: 20, flag: 'No matching handbook section. Needs a person.' }
  }
  const body = unique.map((s) => `${s.text} [${s.section}]`).join('\n\n')
  const lead = sensitive
    ? `Hi ${firstName(ticket.from)},\n\nThank you for telling us. I'm sorry you're dealing with this, and we take it seriously. Here is how to get help:`
    : `Hi ${firstName(ticket.from)},\n\nThanks for your question. Here is what our employee handbook says:`
  const close = sensitive
    ? `A member of the HR team will contact you personally today.\n\nBest,\nBeztak HR`
    : `Let us know if you have any other questions.\n\nBest,\nBeztak HR`
  const confidence = sensitive ? 35 : Math.min(95, 60 + unique.length * 15 + score(ticket, unique[0]) * 4)
  return {
    text: `${lead}\n\n${body}\n\n${close}`,
    citations: unique,
    confidence,
    flag: sensitive ? 'Sensitive topic. A human must review before sending.' : null,
  }
}
