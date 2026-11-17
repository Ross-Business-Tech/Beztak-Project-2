/** Plain-words explanation of how the AI got to its confidence number, so a low score is never a mystery. */
export function ConfidenceWhy({ result }) {
  const d = result?.diag
  if (!d) return null
  const n = (x, one, many) => `${x} ${x === 1 ? one : many}`
  return (
    // Open by default when the score is low, because that is when someone wants to know why.
    <details className="why" open={result.confidence < 80}>
      <summary>Why {result.confidence}% confident?</summary>
      <ul className="small">
        <li><strong>Confidence is how likely the reply is to be correct</strong>, not how fully the documents answer the question.</li>
        <li>{d.passages ? `Searched your documents and sent ${n(d.passages, 'document', 'documents')} (${(d.charsSent || 0).toLocaleString()} characters) to the AI.` : 'No passage in your documents shares words with the question.'}</li>
        {d.passages > 0 && <li>The AI proposed {n(d.proposed, 'fact', 'facts')}; {d.verified} could be backed by an exact quote from the document{d.retriedQuotes ? ' (it was asked a second time to quote exactly)' : ''}.</li>}
        {d.certainty != null && d.writer != null && <li>The AI rated its facts at {d.certainty}% and its reply at {d.writer}%; the score is the average.</li>}
        {d.coverage > 0 && <li>The documents answer about {d.coverage}% of the question. This is shown for information and does not lower the score.</li>}
        {d.caps?.map((c, i) => <li key={i}>Held back because {c}.</li>)}
        {d.notes?.map((c, i) => <li key={i} className="muted">Note: {c}.</li>)}
        {d.handoff && <li><strong>Hand-off reply:</strong> {d.handoff} It makes no factual claim, so it scores high for accuracy; a person still follows up.</li>}
      </ul>
    </details>
  )
}
