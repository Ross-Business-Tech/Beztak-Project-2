// What people may upload, and how a document is prepared for the AI. Shown to the user in the upload box.

import { indexSections } from '../engine/sections'

export const MB = 1024 * 1024
export const MAX_FILE_BYTES = 15 * MB // one file
export const SERVER_TOTAL_BYTES = 30_000_000 // everything the server keeps (its own hard limit)
export const DEMO_TOTAL_BYTES = 4 * MB // the in-browser demo keeps files in the browser, which holds about 5 MB
export const PLAIN_CHARS = 60000 // longest document kept whole when "Split into sections" is off
export const SPLIT_ABOVE = 60000 // documents shorter than this are never split: they are small enough to search whole

export const totalLimit = (serverMode) => (serverMode ? SERVER_TOTAL_BYTES : DEMO_TOTAL_BYTES)
export const fmtMB = (b) => `${(b / MB).toFixed(b >= 10 * MB ? 0 : 1)} MB`
/** How much of the storage allowance the current files take (their stored text counts, so does the index). */
export const usedBytes = (files) => files.filter((f) => f.source !== 'egnyte').reduce((n, f) => n + JSON.stringify(f).length, 0)

/**
 * Prepare readable text for storing. Returns { ok:false, error } if it cannot be accepted, otherwise
 * { ok:true, content, sections, sectioned, cutFrom, warning }.
 */
export function prepareDocument(text, { split, existing, serverMode }) {
  const bytes = new Blob([text]).size
  if (bytes > MAX_FILE_BYTES) return { ok: false, error: `This file is ${fmtMB(bytes)}. The limit is ${fmtMB(MAX_FILE_BYTES)} per file. Split it into smaller files and upload them separately.` }
  const big = text.length > SPLIT_ABOVE
  let content = text
  let sections = []
  let sectioned = false
  let cutFrom = 0
  if (big && split) { sections = indexSections(content); sectioned = sections.length > 1 }
  else if (big) { cutFrom = text.length; content = text.slice(0, PLAIN_CHARS) }
  const added = JSON.stringify({ content, sections }).length
  const left = totalLimit(serverMode) - usedBytes(existing)
  if (added > left) return { ok: false, error: `There is not enough room: this file needs about ${fmtMB(added)} and ${fmtMB(Math.max(0, left))} is free of ${fmtMB(totalLimit(serverMode))}. Delete a file you no longer need first.` }
  const warning = cutFrom ? `Only the first ${PLAIN_CHARS.toLocaleString()} of ${cutFrom.toLocaleString()} characters were kept, so the AI cannot see the rest. Turn on "Split into sections" to keep the whole file.` : ''
  return { ok: true, content, sections, sectioned, cutFrom, warning }
}
