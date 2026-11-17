// Breaks a document into sections (by its headings) and picks only the few sections that matter for one email.
//
// Why: sending whole handbooks to the AI costs a lot and gives it far too much to wade through. The AI now
// sees a handful of small, clearly labelled sections instead. The split happens when a file is added
// (`indexSections`), and is computed on the fly for older files and files synced from other systems.

import { docTerms, queryTerms } from './terms'

const MIN_CHARS = 220 // a section shorter than this is joined to its neighbour
const MAX_CHARS = 2600 // a section longer than this is cut at a paragraph break

/** Is this single line a heading? Returns { title, level } or null. */
function headingOf(line, prev, next) {
  const t = line.trim()
  if (!t || t.length > 90) return null
  let m = t.match(/^(#{1,6})\s+(.+?)\s*#*$/)
  if (m) return { title: m[2], level: m[1].length }
  if (/[.,;:!?]$/.test(t)) return null
  m = t.match(/^(?:section|article|chapter|part)\s+[\w.-]+\b[\s:.-]*(.*)$/i)
  if (m) return { title: t, level: 1 }
  if (/^\d+(\.\d+){0,3}[.)]?\s+[A-Z]/.test(t) && t.split(/\s+/).length <= 12) return { title: t, level: (t.match(/\./g) || []).length > 0 && /^\d+\.\d/.test(t) ? 2 : 1 }
  if (/^[A-Z][A-Z0-9 &/,'()-]{3,}$/.test(t) && /[A-Z]{3}/.test(t) && t.split(/\s+/).length <= 10) return { title: t, level: 1 }
  // A short title-style line standing alone between blank lines, followed by a longer paragraph.
  if (t.length <= 60 && (prev === undefined || prev.trim() === '') && next && next.trim().length > t.length + 20 && /^[A-Z0-9]/.test(t) && t.split(/\s+/).length <= 8) return { title: t, level: 2 }
  return null
}

/**
 * Split text into sections. Each is { heading, start, end } (character positions in the text),
 * so only small numbers need to be stored with a file.
 */
export function splitSections(text) {
  const content = String(text || '')
  if (!content.trim()) return []
  const lines = content.split('\n')
  const marks = [] // where each section begins
  const path = [] // the chain of headings above this point, for example Leave > Bereavement
  let pos = 0
  lines.forEach((line, i) => {
    const h = headingOf(line, lines[i - 1], lines[i + 1])
    if (h) {
      while (path.length && path[path.length - 1].level >= h.level) path.pop()
      path.push(h)
      marks.push({ start: pos, heading: path.map((p) => p.title).join(' > '), level: h.level, title: h.title })
    }
    pos += line.length + 1
  })
  // A document title ("# Employee Handbook", the only top-level heading) would be added to every heading: leave it out.
  const tops = marks.filter((m) => m.level === 1)
  if (tops.length === 1 && marks.some((m) => m.level > 1)) {
    const t = tops[0]
    for (const m of marks) if (m !== t && m.heading.startsWith(`${t.title} > `)) m.heading = m.heading.slice(t.title.length + 3)
  }
  if (!marks.length || marks[0].start > 0) marks.unshift({ start: 0, heading: '' })

  let raw = marks.map((m, i) => ({ heading: m.heading, start: m.start, end: i + 1 < marks.length ? marks[i + 1].start : content.length }))
  // Join tiny sections (a heading with one short line) to the one before, or after if it is the first.
  const merged = []
  for (const s of raw) {
    const prev = merged[merged.length - 1]
    if (prev && (s.end - s.start < MIN_CHARS || prev.end - prev.start < MIN_CHARS) && prev.end - prev.start + (s.end - s.start) <= MAX_CHARS) {
      prev.end = s.end
      if (!prev.heading) prev.heading = s.heading
      else if (s.heading && s.heading !== prev.heading && !prev.heading.includes(s.heading)) prev.heading += ` / ${s.heading.split(' > ').pop()}`
    } else merged.push({ ...s })
  }
  // Cut very long sections at paragraph breaks.
  const out = []
  for (const s of merged) {
    if (s.end - s.start <= MAX_CHARS) { out.push(s); continue }
    const breaks = []
    const re = /\n\s*\n/g
    re.lastIndex = s.start
    let m
    while ((m = re.exec(content)) && m.index < s.end) breaks.push(m.index + m[0].length)
    let from = s.start; let part = 1
    for (const b of breaks) {
      if (b - from >= MAX_CHARS * 0.6 && b < s.end) { out.push({ heading: part === 1 ? s.heading : `${s.heading} (part ${part})`, start: from, end: b }); from = b; part += 1 }
    }
    // Any remainder over the limit is cut hard (a document with no blank lines at all).
    while (s.end - from > MAX_CHARS) { out.push({ heading: `${s.heading || 'Section'} (part ${part})`, start: from, end: from + MAX_CHARS }); from += MAX_CHARS; part += 1 }
    out.push({ heading: part === 1 ? s.heading : `${s.heading || 'Section'} (part ${part})`, start: from, end: s.end })
  }
  return out.filter((s) => content.slice(s.start, s.end).trim()).map((s) => ({ heading: s.heading, start: s.start, end: s.end }))
}

/** The small record kept with a file: [{ h: heading, s: start, e: end }]. */
export const indexSections = (text) => splitSections(text).map((s) => ({ h: s.heading, s: s.start, e: s.end }))

// Older files and files from other systems have no stored index: work it out once and remember it.
const memo = new Map()
const memoKey = (f) => `${f.id}|${f.content.length}|${f.content.slice(0, 40)}|${f.content.slice(-40)}`

/** The sections of one file, as [{ heading, text }]. */
export function sectionsOf(f) {
  if (!f?.content) return []
  let spans = null
  if (Array.isArray(f.sections) && f.sections.length && f.sections.every((x) => x && x.e <= f.content.length && x.s < x.e)) spans = f.sections.map((x) => ({ heading: x.h, start: x.s, end: x.e }))
  if (!spans) {
    const k = memoKey(f)
    spans = memo.get(k)
    if (!spans) {
      spans = splitSections(f.content)
      if (memo.size > 300) memo.delete(memo.keys().next().value)
      memo.set(k, spans)
    }
  }
  return spans.map((s) => ({ heading: s.heading, text: f.content.slice(s.start, s.end).trim() }))
}

const terms = docTerms

// The words of every section are worked out once per file and kept, so a big handbook is not re-read for every email.
const indexMemo = new Map()
function indexOf(f) {
  const k = memoKey(f)
  let idx = indexMemo.get(k)
  if (idx) return idx
  const nameTerms = terms(f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]/g, ' '))
  idx = sectionsOf(f).map((s) => {
    const body = terms(s.text)
    const tf = new Map()
    for (const w of body) tf.set(w, (tf.get(w) || 0) + 1)
    return { heading: s.heading, text: s.text, tf, head: new Set([...terms(s.heading), ...nameTerms]), len: body.length || 1 }
  })
  if (indexMemo.size >= 6) indexMemo.delete(indexMemo.keys().next().value)
  indexMemo.set(k, idx)
  return idx
}

/**
 * Pick the sections most useful for this message, best first, as [{ f, heading, text, score }].
 * Ranking is BM25 over every active section, with extra weight for words in a heading or file name.
 * Nothing that shares no words with the message is returned, so an unrelated question sends no text at all.
 */
export function rankSections(files, query, { budget = 16000, maxSections = 6 } = {}) {
  const q = [...new Set(queryTerms(query))]
  if (!q.length) return []
  const all = []
  for (const f of files) {
    if (!f.active || !f.content) continue
    for (const s of indexOf(f)) if (s.text.length >= 80) all.push({ f, ...s })
  }
  if (!all.length) return []
  const avg = all.reduce((n, s) => n + s.len, 0) / all.length
  const df = new Map()
  for (const w of q) { let n = 0; for (const s of all) if (s.head.has(w) || s.tf.has(w)) n += 1; df.set(w, n) }
  const N = all.length
  for (const s of all) {
    let score = 0
    for (const w of q) {
      const n = df.get(w)
      if (!n) continue
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      const f = (s.tf.get(w) || 0) + (s.head.has(w) ? 3 : 0)
      if (f) score += idf * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (s.len / avg))))
    }
    s.score = score
  }
  const ranked = all.filter((s) => s.score > 0).sort((a, b) => b.score - a.score)
  if (!ranked.length) return []
  const floor = ranked[0].score * 0.3
  const out = []
  let left = budget
  for (const s of ranked) {
    if (out.length >= maxSections || s.score < floor) break
    const text = s.text.length <= left ? s.text : s.text.slice(0, left)
    if (text.length < 80) continue
    out.push({ f: s.f, heading: s.heading, text, score: s.score })
    left -= text.length
  }
  return out
}
