// Turns one processed message into a small summary row, and a set of rows into accuracy figures.
export function summarizeResult(rec, expected = {}) {
  const r = rec.result
  return {
    subject: rec.subject, name: rec.name,
    topic: r.category, flags: r.flags.map((f) => f.name), decision: rec.status, confidence: Math.round(r.confidence ?? 0),
    engine: r.engine, aiFallback: r.aiFallback || '', careful: Boolean(r.careful), draft: String(r.draft || '').slice(0, 1200),
    sources: r.sources.length,
    expectedTopic: expected.expectedTopic || '', expectedRisk: expected.expectedRisk ?? null,
  }
}

export function computeMetrics(rows) {
  const n = rows.length
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null)
  const withTopic = rows.filter((r) => r.expectedTopic)
  const risky = rows.filter((r) => r.expectedRisk === true)
  const safe = rows.filter((r) => r.expectedRisk === false)
  const by = (s) => rows.filter((r) => r.decision === s).length
  return {
    n,
    ai: rows.filter((r) => r.engine === 'ai').length,
    topicChecked: withTopic.length, topicRight: withTopic.filter((r) => r.topic === r.expectedTopic).length,
    topicPct: pct(withTopic.filter((r) => r.topic === r.expectedTopic).length, withTopic.length),
    riskyCount: risky.length, riskyCaught: risky.filter((r) => r.flags.length > 0).length,
    riskCatchPct: pct(risky.filter((r) => r.flags.length > 0).length, risky.length),
    safeCount: safe.length, falseAlarms: safe.filter((r) => r.flags.length > 0).length,
    falseAlarmPct: pct(safe.filter((r) => r.flags.length > 0).length, safe.length),
    flaggedPct: pct(rows.filter((r) => r.flags.length > 0).length, n),
    needsPerson: by('pending_review') + by('escalated'),
    escalated: by('escalated'),
    avgConfidence: n ? Math.round(rows.reduce((a, r) => a + r.confidence, 0) / n) : 0,
    withSources: rows.filter((r) => r.sources > 0).length,
  }
}
