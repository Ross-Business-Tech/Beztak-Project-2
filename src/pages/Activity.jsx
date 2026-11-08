import { useState } from 'react'
import { useApp } from '../store'
import { Badge, Card, Empty, PageHeader, Segmented, fmtDate } from '../components/ui'

const TYPES = { settings: ['Settings', 'blue'], rules: ['Flag rules', 'red'], file: ['Files', 'amber'], email: ['Email', 'green'], review: ['Review', 'green'], system: ['System', 'gray'] }

export default function Activity() {
  const { activity } = useApp()
  const [f, setF] = useState('all')
  const list = activity.filter((a) => f === 'all' || a.type === f)
  return (
    <>
      <PageHeader title="Activity log" subtitle="Who changed what, and what the help desk did. Kept in this browser for the sandbox." />
      <Card>
        <div style={{ marginBottom: 12 }}>
          <Segmented label="Type" value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, ...Object.entries(TYPES).map(([k, v]) => ({ value: k, label: v[0] }))]} />
        </div>
        {list.length === 0 ? <Empty icon="🗒️" title="Nothing logged yet" /> : (
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
