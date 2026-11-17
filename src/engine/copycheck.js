// Catches a reply that is mostly the handbook pasted in. Pure text maths, no AI involved.
//
// A reply is "copied" when long runs of its words appear unchanged in the documents it was given.
// Short shared phrases ("paid time off", "submit a request in the HR portal") are normal and ignored.

const words = (t) => String(t || '').toLowerCase().replace(/[’']/g, '').match(/[a-z0-9]+/g) || []

const SHINGLE = 6 // a run of 6 identical words in a row counts as copied

export const COPY_LIMITS = { ratio: 0.3, run: 16 }

/**
 * How much of `draft` is copied from `sources` (an array of document texts).
 * Returns { ratio, longestRun, copied: [phrases] }:
 *  ratio      share of the reply's words that sit inside a copied run (0 to 1)
 *  longestRun the longest copied run, in words
 */
export function copyCheck(draft, sources) {
  const d = words(draft)
  if (d.length < SHINGLE) return { ratio: 0, longestRun: 0, copied: [], tooClose: false }
  const seen = new Set()
  for (const s of sources) {
    const w = words(s)
    for (let i = 0; i + SHINGLE <= w.length; i += 1) seen.add(w.slice(i, i + SHINGLE).join(' '))
  }
  const hit = new Array(d.length).fill(false)
  for (let i = 0; i + SHINGLE <= d.length; i += 1) {
    if (seen.has(d.slice(i, i + SHINGLE).join(' '))) for (let k = i; k < i + SHINGLE; k += 1) hit[k] = true
  }
  let longestRun = 0; let run = 0; const copied = []; let start = 0
  for (let i = 0; i <= d.length; i += 1) {
    if (i < d.length && hit[i]) { if (!run) start = i; run += 1 } else if (run) {
      longestRun = Math.max(longestRun, run)
      if (run >= 10) copied.push(d.slice(start, start + run).join(' '))
      run = 0
    }
  }
  const ratio = hit.filter(Boolean).length / d.length
  return { ratio, longestRun, copied: copied.slice(0, 3), tooClose: ratio > COPY_LIMITS.ratio || longestRun >= COPY_LIMITS.run }
}
