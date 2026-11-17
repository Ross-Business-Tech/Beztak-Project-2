// Reads requests from a pasted or uploaded spreadsheet (CSV) or from JSON. Everything runs in the browser.
import { CATEGORIES } from '../data/defaults'

export function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false
  const s = String(text).replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((x) => x.trim() !== '')) rows.push(row); row = [] }
    else cell += c
  }
  row.push(cell); if (row.some((x) => x.trim() !== '')) rows.push(row)
  return rows
}

const SYN = {
  name: ['name', 'sender_name', 'sender name', 'employee', 'employee_name', 'from_name'],
  from: ['from', 'email', 'sender', 'sender_email', 'sender email', 'from_email', 'employee_email'],
  subject: ['subject', 'title', 'topic_line', 'ticket_subject'],
  body: ['body', 'message', 'description', 'text', 'content', 'request', 'email_body'],
  receivedAt: ['received_at', 'received', 'date', 'created', 'created_at', 'created_time', 'timestamp'],
  expectedTopic: ['expected_topic', 'topic', 'category', 'expected_category', 'expected topic'],
  expectedRisk: ['expected_risk', 'risk', 'flagged', 'escalate', 'expected_flag', 'expected risk'],
}
const norm = (h) => String(h).trim().toLowerCase().replace(/[\s-]+/g, '_')

export function topicId(v) {
  const t = String(v ?? '').trim().toLowerCase()
  if (!t) return ''
  const hit = CATEGORIES.find((c) => c.id === t || c.label.toLowerCase() === t || c.label.toLowerCase().startsWith(t))
  return hit ? hit.id : ''
}
export function riskFlag(v) {
  const t = String(v ?? '').trim().toLowerCase()
  if (['yes', 'y', 'true', '1', 'risky', 'high', 'critical', 'escalate'].includes(t)) return true
  if (['no', 'n', 'false', '0', 'none', 'safe', 'low'].includes(t)) return false
  return null
}

/** Returns { rows, problems }. Each row: { name, from, subject, body, receivedAt, expectedTopic, expectedRisk }. */
export function parseRequests(input) {
  const text = String(input || '').trim()
  if (!text) return { rows: [], problems: [] }
  let objs
  if (text.startsWith('[')) {
    try { objs = JSON.parse(text).map((o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [norm(k), v]))) } catch { return { rows: [], problems: ['That looks like JSON but could not be read.'] } }
  } else {
    const table = parseCsv(text)
    if (table.length < 2) return { rows: [], problems: ['Add a header row and at least one request.'] }
    const head = table[0].map(norm)
    objs = table.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
  }
  const pick = (o, key) => { for (const k of SYN[key]) { const v = o[norm(k)]; if (v !== undefined && String(v).trim() !== '') return String(v) } return '' }
  const problems = []; const rows = []
  objs.forEach((o, i) => {
    const body = pick(o, 'body').trim(); const subject = pick(o, 'subject').trim()
    if (!body) { problems.push(`Row ${i + 1} has no message text, so it was skipped.`); return }
    const topicRaw = pick(o, 'expectedTopic'); const riskRaw = pick(o, 'expectedRisk')
    if (topicRaw && !topicId(topicRaw)) problems.push(`Row ${i + 1}: topic "${topicRaw}" is not one of the known topics, so no expected topic was set.`)
    rows.push({
      name: pick(o, 'name').trim(), from: pick(o, 'from').trim(), subject: subject || body.slice(0, 60), body,
      receivedAt: pick(o, 'receivedAt').trim(), expectedTopic: topicId(topicRaw), expectedRisk: riskFlag(riskRaw),
    })
  })
  return { rows, problems }
}
