import { randomBytes } from 'node:crypto'

let counter = 0
export const uid = (p) => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}${randomBytes(3).toString('hex')}`
export const nowIso = () => new Date().toISOString()

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" }

/** Ticket text from Zoho is HTML. The AI and reviewers need plain text. */
export function htmlToText(html) {
  if (!html) return ''
  return String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const clip = (s, n) => (String(s ?? '').length > n ? String(s).slice(0, n) : String(s ?? ''))
