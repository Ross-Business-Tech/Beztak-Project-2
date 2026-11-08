import { useApp } from '../store'
import { CATEGORIES } from '../data/defaults'
import { Badge, Card, HelpPanel, Empty, PageHeader, SeverityBadge, StatusBadge, timeAgo } from '../components/ui'


export default function Dashboard() {
  const { emails, settings, rules, files, activity, workflow } = useApp()
  const autoSends = workflow.nodes.some((n) => n.data.kind === 'email_out' && !n.data.config.requireApproval)
  const week = emails.filter((e) => Date.now() - new Date(e.receivedAt) < 7 * 864e5)
  const auto = week.filter((e) => e.status === 'auto_sent').length
  const open = emails.filter((e) => e.status === 'pending_review' || e.status === 'escalated')
  const flagged = week.filter((e) => e.result.flags.length)
  const replied = week.filter((e) => e.status === 'auto_sent' || e.status === 'approved_sent').length
  const hoursSaved = (replied * settings.minutesSavedPerReply) / 60
  const reviewed = week.filter((e) => e.status === 'approved_sent')
  const unchanged = reviewed.filter((e) => !e.wasEdited).length
  const qualityPct = reviewed.length ? Math.round((unchanged / reviewed.length) * 100) : null

  const byCat = CATEGORIES.map((c) => ({ ...c, n: week.filter((e) => e.result.category === c.id).length })).filter((c) => c.n).sort((a, b) => b.n - a.n)
  const maxCat = Math.max(1, ...byCat.map((c) => c.n))
  const flagCounts = rules.map((r) => ({ r, n: week.filter((e) => e.result.flags.some((f) => f.ruleId === r.id)).length })).filter((x) => x.n).sort((a, b) => b.n - a.n)
  const activeFiles = files.filter((f) => f.active && f.content).length

  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="Last 7 days. Sample data until Zoro is connected." />
      <HelpPanel id="dash" steps={[
        'The four figures at the top summarise the last seven days. "Answered automatically" is the share sent without a person. "Time saved" multiplies replies by the minutes set in Settings. "Drafts sent without edits" shows answer quality: the higher it is, the less reviewers rewrite.',
        'Current setup shows how many blocks your workflow has and whether anything sends automatically. Select Change to open the Workflow.',
        'Needs attention lists drafts and flagged messages waiting for a person. Select Open queue to work through them.',
        'The two charts show what employees ask about and which flag rules are triggered most.',
      ]} note="Figures here include sample data and any test emails you have sent." />
      <div className="tiles">
        <div className="tile"><div className="num">{week.length}</div><div className="lbl">Emails received</div></div>
        <div className="tile"><div className="num">{week.length ? Math.round((auto / week.length) * 100) : 0}%</div><div className="lbl">Answered automatically</div></div>
        <div className="tile"><div className="num">{hoursSaved.toFixed(1)} h</div><div className="lbl">Estimated time saved ({replied} replies at {settings.minutesSavedPerReply} min)</div></div>
        <div className="tile"><div className="num">{qualityPct === null ? 'n/a' : `${qualityPct}%`}</div><div className="lbl">AI drafts sent without edits ({reviewed.length} reviewed)</div></div>
      </div>

      <div className="grid-2">
        <Card title="Current setup" actions={<a className="btn small" href="#/admin/workflow">Change</a>}>
          <div className="stack" style={{ gap: 10 }}>
            <div className="row between"><span>Workflow</span><strong>{workflow.nodes.length} blocks</strong></div>
            <div className="row between"><span>Automatic sending</span><Badge tone={autoSends ? 'amber' : 'blue'}>{autoSends ? 'On for some paths' : 'Off: a person approves'}</Badge></div>
            <div className="row between"><span>Risk rules watching</span><strong>{rules.length}</strong></div>
            <div className="row between"><span>Documents the AI can read</span><strong>{activeFiles} of {files.length}</strong></div>
            <div className="row between"><span>Zoro (tickets)</span><Badge>{settings.integrations.zoro.enabled ? 'Simulated' : 'Not connected'}</Badge></div>
          </div>
        </Card>
        <Card title={`Needs attention (${open.length})`} actions={<a className="btn small" href="#/admin/review">Open queue</a>}>
          {open.length === 0 ? <Empty title="All caught up" /> : (
            <div className="list">
              {open.slice(0, 5).map((e) => (
                <a key={e.id} className="item" href="#/admin/review" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="body">
                    <div className="truncate cell-title">{e.subject}</div>
                    <div className="meta"><StatusBadge status={e.status} />{e.result.flags.length > 0 && <SeverityBadge severity={['critical', 'high', 'medium'].find((s) => e.result.flags.some((f) => f.severity === s))} />}<span className="muted small">{timeAgo(e.receivedAt)}</span></div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <Card title="What people are asking about">
          {byCat.length === 0 ? <Empty title="No data yet" /> : (
            <div className="bars">{byCat.map((c) => (
              <div key={c.id} className="bar-row"><span className="truncate">{c.label}</span><div className="bar"><div style={{ width: `${(c.n / maxCat) * 100}%` }} /></div><strong>{c.n}</strong></div>
            ))}</div>
          )}
        </Card>
        <Card title={`Flagged messages (${flagged.length})`} actions={<a className="btn small" href="#/admin/workflow">Edit rules</a>}>
          {flagCounts.length === 0 ? <Empty title="Nothing flagged this week" /> : (
            <div className="bars">{flagCounts.map(({ r, n }) => (
              <div key={r.id} className="bar-row"><span className="truncate">{r.name}</span><div className="bar"><div style={{ width: `${(n / flagCounts[0].n) * 100}%`, background: 'var(--red)' }} /></div><strong>{n}</strong></div>
            ))}</div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 16 }} />
      <Card title="Recent activity" actions={<a className="btn small" href="#/admin/activity">See all</a>}>
        <div className="list">
          {activity.slice(0, 6).map((a) => <div key={a.id} className="row between item" style={{ cursor: 'default' }}><span>{a.text}</span><span className="muted small">{timeAgo(a.at)}</span></div>)}
        </div>
      </Card>
    </>
  )
}
