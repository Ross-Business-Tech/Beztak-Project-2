import { useState } from 'react'
import { useApp } from '../store'
import { Badge, Card, HelpPanel, Empty, PageHeader, Segmented, fmtDate } from '../components/ui'

const TYPES = { settings: ['Settings', 'blue'], workflow: ['Workflow', 'red'],
  alert: ['Alerts', 'amber'], file: ['Files', 'amber'], email: ['Email', 'green'], review: ['Review', 'green'], system: ['System', 'gray'] }

export default function Activity() {
  const { activity } = useApp()
  const [f, setF] = useState('all')
  const list = activity.filter((a) => f === 'all' || a.type === f)
  return (
    <>
      <PageHeader title="Activity log" subtitle="Who changed what, and what the help desk did. Stored in this browser during testing." />
      <HelpPanel id="activity" steps={[
        'Every change to settings, flag rules and files, and every email the help desk handles, appears here with a time.',
        'Use the filters to focus on one type of event, for example Flag rules to see who changed what is flagged.',
      ]} note="In this test environment the log is stored in your browser only. In production it would be a shared audit trail." />
      <Card>
        <div style={{ marginBottom: 12 }}>
          <Segmented label="Type" value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, ...Object.entries(TYPES).map(([k, v]) => ({ value: k, label: v[0] }))]} />
        </div>
        {list.length === 0 ? <Empty title="Nothing logged yet" /> : (
          <div className="table-wrap"><table>
            <thead><tr><th>When</th><th>Type</th><th>What happened</th></tr></thead>
            <tbody>{list.map((a) => (
              <tr key={a.id}><td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(a.at)}</td><td><Badge tone={(TYPES[a.type] || TYPES.system)[1]}>{(TYPES[a.type] || TYPES.system)[0]}</Badge></td><td>{a.text}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  )
}
