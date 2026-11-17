// What the AI costs: a price list, and an estimate of what an email (or a whole import) will use.
// Figures are estimates (about 4 characters per token) so people can plan and set limits; the provider's invoice is the truth.

// US dollars per million tokens: [input, output]. Anthropic's own API rates. A model that is not listed here gets its
// price from the fields in Settings, and without one the app cannot show a cost for it.
export const PRICES = {
  'claude-fable-5-2': [8, 40], 'claude-fable-5-1': [10, 50], 'claude-fable-5': [10, 50],
  'claude-opus-5-5': [4, 20], 'claude-opus-5': [5, 25], 'claude-opus-4-8': [5, 25], 'claude-opus-4-7': [5, 25], 'claude-opus-4-6': [5, 25],
  'claude-sonnet-5-5': [2, 10], 'claude-sonnet-5': [2, 10], 'claude-sonnet-4-6': [3, 15], 'claude-sonnet-4-5': [3, 15],
  'claude-haiku-5-5': [0.1, 0.5], 'claude-haiku-4-5': [1, 5],
}
export const CHARS_PER_TOKEN = 4

/** "anthropic/claude-sonnet-4.5" and "claude-sonnet-4-5-20250929" both become "claude-sonnet-4-5". */
export const normalizeModel = (name) => String(name || '').trim().toLowerCase().replace(/^anthropic\//, '').replace(/\./g, '-').replace(/-\d{8}$/, '')

const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v))

/**
 * The price of one model: { in, out, source } or null when unknown.
 * `ai` is the AI part of the settings: priceIn/priceOut apply to the main model, readPriceIn/readPriceOut to the reading model.
 */
export function priceFor(model, ai = {}) {
  const m = normalizeModel(model)
  const main = normalizeModel(ai.model)
  const read = normalizeModel(ai.readModel)
  const o = m && m === main ? [num(ai.priceIn), num(ai.priceOut)] : m && m === read ? [num(ai.readPriceIn), num(ai.readPriceOut)] : [NaN, NaN]
  if (Number.isFinite(o[0]) && Number.isFinite(o[1])) return { in: o[0], out: o[1], source: 'settings' }
  const t = PRICES[m]
  return t ? { in: t[0], out: t[1], source: 'list' } : null
}

export const estimateTokens = (chars) => Math.ceil(chars / CHARS_PER_TOKEN)
export const usd = (inTok, outTok, p) => (p ? (inTok / 1e6) * p.in + (outTok / 1e6) * p.out : 0)

// Rough sizes of the fixed parts of each prompt, in characters, and typical answers, in tokens.
const SIZES = { understandSystem: 2600, factsSystem: 1500, writerSystem: 1500, understandOut: 90, factsOut: 380, writerOut: 260 }

/**
 * Estimate one email. `docChars` is how many characters of documents the facts step would read
 * (0 means nothing matched). Returns calls with token counts, for a typical run and a worst case.
 */
export function estimateEmail({ email, docChars, settings }) {
  const ai = settings.ai || {}
  const readModel = ai.readModel || ai.model
  const readP = priceFor(readModel, ai)
  const writeP = priceFor(ai.model, ai)
  const emailChars = `${email.subject || ''}\n${email.body || ''}`.length + 60
  const instr = (settings.writingInstructions || '').length || 1000
  const calls = []
  const add = (kind, inChars, outTok) => calls.push({ kind, inTok: estimateTokens(inChars), outTok })
  add('read', SIZES.understandSystem + emailChars, SIZES.understandOut)
  const skip = settings.skipAIWhenNoMatch !== false && docChars === 0
  if (!skip) {
    if (docChars > 0) add('read', SIZES.factsSystem + docChars + emailChars, SIZES.factsOut)
    add('write', SIZES.writerSystem + instr + emailChars + 900, SIZES.writerOut)
  }
  const cost = (cs) => cs.reduce((n, c) => n + usd(c.inTok, c.outTok, c.kind === 'read' ? readP : writeP), 0)
  const typical = cost(calls)
  // Worst case: the reply copies the documents and is rewritten once, and the workflow retries the facts and the writing once more.
  const writes = skip ? [] : calls.filter((c) => c.kind === 'write')
  const rewrite = writes.map((c) => ({ ...c, inTok: c.inTok + estimateTokens(emailChars + 800) }))
  const retry = skip ? [] : calls.slice(1)
  const high = typical + cost(rewrite) + cost(retry)
  return { calls, typical, high, skipped: skip, unknownPrice: !readP || !writeP }
}

/** Estimate a whole import. `docCharsFor(row)` gives the document characters that row would pull in. */
export function estimateRun(rows, docCharsFor, settings) {
  let typical = 0; let high = 0; let calls = 0; let inTok = 0; let outTok = 0; let skipped = 0; let unknownPrice = false
  for (const row of rows) {
    const e = estimateEmail({ email: row, docChars: docCharsFor(row), settings })
    typical += e.typical; high += e.high; calls += e.calls.length; unknownPrice ||= e.unknownPrice; if (e.skipped) skipped += 1
    for (const c of e.calls) { inTok += c.inTok; outTok += c.outTok }
  }
  return { emails: rows.length, typical, high, calls, inTok, outTok, skipped, unknownPrice, perEmail: rows.length ? typical / rows.length : 0 }
}

export const fmtUsd = (n) => (n >= 10 ? `$${n.toFixed(0)}` : n >= 1 ? `$${n.toFixed(2)}` : n >= 0.01 ? `$${n.toFixed(3)}` : n > 0 ? '<$0.01' : '$0')
