// A running total of what the AI has been used for today, and the daily spending limit.
// The total is an estimate from token counts. Where it is kept depends on where the app runs: the server
// keeps it in its database (shared by everyone), the in-browser demo keeps it in the browser.

import { estimateTokens, priceFor, usd } from './cost'

let store = null // { read(), write(value) }
let cfg = { dailyUsd: 0, ai: {} }

export const setUsageStore = (s) => { store = s }
export const configureUsage = (settings) => { cfg = { dailyUsd: Math.max(0, Number(settings?.aiLimits?.dailyUsd) || 0), ai: settings?.ai || {} } }

const today = () => new Date().toISOString().slice(0, 10) // the day changes at midnight UTC
const blank = () => ({ day: today(), usd: 0, calls: 0, inTok: 0, outTok: 0, unpriced: 0 })

export function readUsage() {
  let u = null
  try { u = store?.read() } catch { u = null }
  return u && u.day === today() ? { ...blank(), ...u } : blank()
}

/** Is today's limit used up? */
export function budgetState() {
  const u = readUsage()
  return { over: cfg.dailyUsd > 0 && u.usd >= cfg.dailyUsd, usd: u.usd, limit: cfg.dailyUsd, calls: u.calls }
}

export const budgetMessage = (b) => `The daily AI spending limit ($${b.limit.toFixed(2)}) has been reached, so the AI is paused until tomorrow (midnight UTC). An admin can raise the limit in Settings.`

/** Add one AI call to today's total. Token counts come from the provider when it sent them, otherwise from text length. */
export function recordUsage({ model, inChars, outChars, usage }) {
  if (!store) return
  const inTok = Number(usage?.prompt_tokens ?? usage?.input_tokens) || estimateTokens(inChars)
  const outTok = Number(usage?.completion_tokens ?? usage?.output_tokens) || estimateTokens(outChars)
  const price = priceFor(model, cfg.ai)
  const u = readUsage()
  u.calls += 1; u.inTok += inTok; u.outTok += outTok
  if (price) u.usd += usd(inTok, outTok, price); else u.unpriced += 1
  try { store.write(u) } catch { /* the total is only a guide */ }
}
