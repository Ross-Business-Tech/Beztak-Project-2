import { randomBytes } from 'node:crypto'

let counter = 0
export const uid = (p) => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}${randomBytes(3).toString('hex')}`
export const nowIso = () => new Date().toISOString()

const NAMED = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m }
    return NAMED[e.toLowerCase()] ?? m
  })
}

/** Ticket text from Zoho is HTML. The AI and reviewers need plain text. */
export function htmlToText(html) {
  if (!html) return ''
  return decodeEntities(String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, ''))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const clip = (s, n) => (String(s ?? '').length > n ? String(s).slice(0, n) : String(s ?? ''))
