// Catches numbers in a reply that the documents never gave. A made-up "20 days" or "$50" is the most damaging
// kind of mistake in an HR reply, and it is easy to check: every figure in the reply must appear in the facts
// the AI was given, or in the employee's own message.

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, ninety: 90, hundred: 100 }

export function figures(text) {
  const t = String(text || '').toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|hundred)\b/g, (w) => String(WORDS[w]))
  return new Set((t.match(/\d+(?:[.,]\d+)*/g) || []).map((n) => n.replace(/,(?=\d{3}\b)/g, '').replace(/\.0+$/, '')))
}

/** Figures in `draft` that appear in none of `support` (texts). Our own hand-off wording and list numbers are ignored. */
export function unsupportedFigures(draft, support) {
  const cleaned = String(draft || '').replace(/^\s*\d+[.)]\s/gm, '').replace(/within (one|1) business day/gi, '').replace(/\b(one|1) business day\b/gi, '')
  const have = new Set()
  for (const s of support) figures(s).forEach((n) => have.add(n))
  return [...figures(cleaned)].filter((n) => !have.has(n)).slice(0, 5)
}
