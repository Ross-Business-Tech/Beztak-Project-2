import { useRef, useState } from 'react'
import { useApp } from '../store'
import { CATEGORIES } from '../data/defaults'
import { parseRequests } from '../lib/csv'
import { computeMetrics } from '../workflow/evaluate'
import { Badge, Card, Empty, Field, HelpPanel, PageHeader, Segmented, fmtDate } from '../components/ui'

const MAX_ROWS = 200
const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || 'Other'
const EXAMPLE = `name,from,subject,body,expected_topic,expected_risk
Riley Demo,riley.demo@example.com,PTO balance,"Hi, how many vacation days do I have left this year?",time_off,no
Jordan Example,jordan.example@example.com,Concerned,"My manager keeps making inappropriate comments and I am afraid to report it.",other,yes`

export default function Import() {
  const { importRequest, evaluateRequest, saveEvalRun, evalRuns = [], toast, serverMode } = useApp()
  const [text, setText] = useState('')
  const [mode, setMode] = useState('evaluate')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState(null)
  const cancel = useRef(false)
  const parsed = parseRequests(text)
  const over = parsed.rows.length > MAX_ROWS

  function loadFile(e) {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 3_000_000) { toast('That file is too large (3 MB maximum).', 'warn'); return }
    const r = new FileReader(); r.onload = () => setText(String(r.result || '')); r.readAsText(f)
  }

  async function run() {
    const rows = parsed.rows.slice(0, MAX_ROWS)
    if (!rows.length) return
    cancel.current = false; setBusy(true); setResults(null); setProgress({ done: 0, total: rows.length })
    const out = []; let next = 0; let failed = 0
    const worker = async () => {
      while (next < rows.length && !cancel.current) {
        const i = next++; const row = rows[i]
        const res = mode === 'evaluate' ? await evaluateRequest(row) : await importRequest(row)
        if (!res) failed++
        else out[i] = mode === 'evaluate' ? res : { subject: res.subject }
        setProgress((p) => ({ ...p, done: p.done + 1 }))
      }
    }
    await Promise.all([worker(), worker(), worker()])
    const done = out.filter(Boolean)
    setBusy(false)
    if (mode === 'evaluate') {
      setResults(done)
      if (done.length) toast(`Checked ${done.length} request${done.length === 1 ? '' : 's'}.${failed ? ` ${failed} could not be processed.` : ''}`, failed ? 'warn' : 'ok')
    } else {
      toast(`${done.length} request${done.length === 1 ? '' : 's'} added to the Review queue.${failed ? ` ${failed} failed.` : ''}`, failed ? 'warn' : 'ok')
      setText('')
    }
  }

  return (
    <>
      <PageHeader title="Import and evaluate" subtitle="Bring in real requests from a spreadsheet, or measure how well the assistant handles them." />
      <HelpPanel id="import" steps={[
        'Paste a spreadsheet (CSV) or upload a .csv file. Needed columns: subject and body (the message). Optional: name, from, received_at.',
        'Choose "Check accuracy" to run every request through your Workflow without adding anything to the Review queue. Add expected_topic and expected_risk (yes or no) columns to see how often the assistant agrees with you.',
        'Choose "Add to Review queue" to have people review them like any other request. Imported requests are never sent anywhere automatically.',
        'Use made-up or anonymized requests when testing. Remove names and ID numbers first.',
      ]} />
      <Card title="1. Your requests" hint={`Up to ${MAX_ROWS} at a time.`}>
        <Field label="Paste CSV or JSON">{(id) => <textarea id={id} rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} spellCheck={false} />}</Field>
        <div className="row" style={{ marginTop: 8 }}>
          <label className="btn">Upload a CSV file<input type="file" accept=".csv,.txt,.json,text/csv" onChange={loadFile} style={{ display: 'none' }} /></label>
          <button className="btn" type="button" onClick={() => setText(EXAMPLE)}>Use an example</button>
          <a className="btn" href="/sample-requests.csv" download>Download a sample file</a>
          {text && <button className="btn" type="button" onClick={() => { setText(''); setResults(null) }}>Clear</button>}
        </div>
        {text && (
          <p className="small" style={{ marginTop: 10 }}>
            <strong>{parsed.rows.length}</strong> request{parsed.rows.length === 1 ? '' : 's'} found.
            {over && <> <Badge tone="amber">Only the first {MAX_ROWS} will be used</Badge></>}
            {parsed.rows.some((r) => r.expectedTopic || r.expectedRisk !== null) && <> Expected answers found for scoring.</>}
          </p>
        )}
        {parsed.problems.length > 0 && <ul className="small muted" style={{ paddingLeft: 18 }}>{parsed.problems.slice(0, 5).map((p, i) => <li key={i}>{p}</li>)}{parsed.problems.length > 5 && <li>and {parsed.problems.length - 5} more.</li>}</ul>}
      </Card>

      <div style={{ marginTop: 16 }} />
      <Card title="2. What to do with them">
        <Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: 'evaluate', label: 'Check accuracy' }, { value: 'queue', label: 'Add to Review queue' }]} />
        <p className="muted small" style={{ margin: '10px 0' }}>{mode === 'evaluate' ? 'Nothing is saved to the queue. You get a scorecard. Each request is read by the AI, so this uses your AI allowance (a few cents per hundred requests with Claude Haiku).' : 'Each request is read by the AI and drafted, then waits in the Review queue for a person.'}</p>
        <div className="row">
          <button className="btn primary" disabled={busy || parsed.rows.length === 0} onClick={run}>{busy ? `Working... ${progress.done} of ${progress.total}` : mode === 'evaluate' ? 'Run the check' : 'Add to Review queue'}</button>
          {busy && <button className="btn" onClick={() => { cancel.current = true }}>Stop</button>}
        </div>
        {busy && <div className="meter" style={{ marginTop: 12 }} role="progressbar" aria-valuenow={progress.done} aria-valuemax={progress.total}><div style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, height: 8, background: 'var(--accent, #2f6fed)', borderRadius: 4 }} /></div>}
      </Card>

      {results && results.length > 0 && <Scorecard rows={results} serverMode={serverMode} onSave={() => saveEvalRun({ name: `Check of ${results.length} requests`, rows: results }).then((r) => r && toast('Saved'))} />}

      {evalRuns.length > 0 && (
        <>
          <div style={{ marginTop: 16 }} />
          <Card title="Saved checks" hint="Kept so the team can compare results after changing the Workflow or documents.">
            <div className="list">
              {evalRuns.map((r) => {
                const m = computeMetrics(r.rows)
                return (
                  <button key={r.id} className="item" onClick={() => setResults(r.rows)}>
                    <div className="body"><div className="cell-title">{r.name}</div><div className="muted small">{fmtDate(r.at)} · {r.by} · {m.n} requests{m.topicPct !== null ? ` · topics ${m.topicPct}% right` : ''}{m.riskCatchPct !== null ? ` · risks caught ${m.riskCatchPct}%` : ''}</div></div>
                  </button>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </>
  )
}

function Tile({ label, value, sub, tone }) {
  return <div className="tile"><div className="muted small">{label}</div><div style={{ fontSize: 26, fontWeight: 650, color: tone === 'bad' ? 'var(--red)' : tone === 'good' ? 'var(--green)' : undefined }}>{value}</div>{sub && <div className="muted small">{sub}</div>}</div>
}

function Scorecard({ rows, onSave }) {
  const m = computeMetrics(rows)
  const [show, setShow] = useState('all')
  const wrongTopic = (r) => r.expectedTopic && r.topic !== r.expectedTopic
  const missedRisk = (r) => r.expectedRisk === true && r.flags.length === 0
  const falseAlarm = (r) => r.expectedRisk === false && r.flags.length > 0
  const list = rows.filter((r) => (show === 'issues' ? wrongTopic(r) || missedRisk(r) || falseAlarm(r) : true))
  return (
    <>
      <div style={{ marginTop: 16 }} />
      <Card title="Scorecard" actions={<button className="btn small" onClick={onSave}>Save this check</button>}>
        {m.ai < m.n && <div className="outcome amber" role="note" style={{ marginBottom: 12 }}><div><strong>The AI did not read {m.n - m.ai} of {m.n} requests.</strong> Those used the simple built-in word matcher, so the scores below understate the real assistant. Check the AI connection in Settings.</div></div>}
        <div className="tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <Tile label="Requests checked" value={m.n} sub={`${m.ai} read by the AI`} />
          <Tile label="Topic matches your answer" value={m.topicPct === null ? 'n/a' : `${m.topicPct}%`} sub={m.topicPct === null ? 'add expected_topic' : `${m.topicRight} of ${m.topicChecked}`} tone={m.topicPct !== null && m.topicPct >= 85 ? 'good' : undefined} />
          <Tile label="Risky messages caught" value={m.riskCatchPct === null ? 'n/a' : `${m.riskCatchPct}%`} sub={m.riskCatchPct === null ? 'add expected_risk' : `${m.riskyCaught} of ${m.riskyCount}`} tone={m.riskCatchPct === null ? undefined : m.riskCatchPct === 100 ? 'good' : 'bad'} />
          <Tile label="False alarms" value={m.falseAlarmPct === null ? 'n/a' : `${m.falseAlarmPct}%`} sub={m.falseAlarmPct === null ? 'add expected_risk' : `${m.falseAlarms} of ${m.safeCount} safe`} />
          <Tile label="Need a person" value={`${m.needsPerson}`} sub={`${m.escalated} escalated`} />
          <Tile label="Average confidence" value={`${m.avgConfidence}%`} sub={`${m.withSources} cited a policy`} />
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>A missed risky message is the costly mistake, so aim for 100% there and accept some false alarms. Fix misses in the Workflow's risk filters, then run the same file again to compare.</p>
      </Card>
      <div style={{ marginTop: 16 }} />
      <Card title="Each request" actions={<Segmented label="Show" value={show} onChange={setShow} options={[{ value: 'all', label: 'All' }, { value: 'issues', label: 'Disagreements' }]} />}>
        {list.length === 0 ? <Empty title="Nothing to show">No disagreements with your expected answers.</Empty> : (
          <div className="list">
            {list.map((r, i) => (
              <div key={i} className="item" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                <div className="body">
                  <div className="cell-title truncate">{r.subject}</div>
                  <div className="meta" style={{ marginTop: 4 }}>
                    <Badge>{catLabel(r.topic)}</Badge>
                    {r.flags.map((f) => <Badge key={f} tone="red">{f}</Badge>)}
                    <Badge tone={r.decision === 'escalated' ? 'red' : undefined}>{r.decision.replace('_', ' ')}</Badge>
                    <span className="muted small">{r.confidence}% confident</span>
                  </div>
                  {(wrongTopic(r) || missedRisk(r) || falseAlarm(r)) && (
                    <div className="small" style={{ marginTop: 6, color: 'var(--red)' }}>
                      {wrongTopic(r) && <>You expected topic {catLabel(r.expectedTopic)}. </>}{missedRisk(r) && <>You marked this risky but nothing was flagged. </>}{falseAlarm(r) && <>You marked this safe but it was flagged. </>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
