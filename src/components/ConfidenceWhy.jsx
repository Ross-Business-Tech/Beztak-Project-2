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
        <li>{d.passages ? `Searched your documents and sent ${n(d.passages, 'document', 'documents')} (${(d.charsSent || 0).toLocaleString()} characters) to the AI.` : 'No passage in your documents shares words with the question.'}</li>
        {d.passages > 0 && <li>The AI proposed {n(d.proposed, 'fact', 'facts')}; {d.verified} could be backed by an exact quote from the document{d.retriedQuotes ? ' (it was asked a second time to quote exactly)' : ''}.</li>}
        {d.coverage > 0 && <li>The AI rated how fully the documents answer the question at {d.coverage}%{d.writer !== null ? `, and its own reply at ${d.writer}%` : ''}.</li>}
        {d.caps?.map((c, i) => <li key={i}>Held back because {c}.</li>)}
        {d.handoff && <li><strong>Hand-off reply used:</strong> {d.handoff}</li>}
      </ul>
    </details>
  )
}
