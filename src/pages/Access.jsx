// Admin-only page: who can use the help desk, and which pages people with the Reviewer role can open.
import { useState } from 'react'
import { useApp, uid } from '../store'
import { DEFAULT_SETTINGS } from '../data/defaults'
import { Badge, Card, Field, Icon, PageHeader, SettingRow, Toggle } from '../components/ui'
import { TeamCard } from '../components/ServerAdmin'

// Pages an admin can open up to reviewers. Review queue and Getting started are always open;
// Settings and Access are always admin-only, so a reviewer can never change their own access.
export const REVIEWER_PAGES = [
  { key: 'dashboard', label: 'Dashboard', hint: 'Volumes, time saved and how replies were handled.' },
  { key: 'import', label: 'Import and evaluate', hint: 'Bring in requests from a spreadsheet and run accuracy checks.' },
  { key: 'workflow', label: 'Workflow', hint: 'See how emails are routed and flagged. View only.' },
  { key: 'files', label: 'Knowledge files', hint: 'See the policies the AI answers from. View only.' },
  { key: 'activity', label: 'Activity log', hint: 'Everything the system and the team have done.' },
  { key: 'lab', label: 'Test emails', hint: 'Send practice emails through the assistant.' },
  { key: 'labDocs', label: 'Test a document', hint: 'Try the assistant against a practice document.' },
]

export const accessOf = (settings) => ({ ...DEFAULT_SETTINGS.reviewerAccess, ...(settings?.reviewerAccess || {}) })

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Test environment: a simple list of people. Nothing is emailed and no one signs in. */
function PeopleCard() {
  const { settings, updateSettings, toast } = useApp()
  const people = settings.people || []
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('reviewer')
  const [error, setError] = useState('')
  const admins = people.filter((p) => p.role === 'admin').length

  function add(e) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!EMAIL.test(clean)) return setError('Enter a full email address, like name@company.com.')
    if (people.some((p) => p.email === clean)) return setError('That email already has access.')
    updateSettings({ people: [...people, { id: uid('p'), email: clean, role }] }, `Gave ${clean} ${role === 'admin' ? 'admin' : 'reviewer'} access`)
    setEmail(''); setError(''); toast(`Access given to ${clean}`)
  }
  function changeRole(p, next) {
    if (p.role === 'admin' && next !== 'admin' && admins <= 1) return toast('Keep at least one admin.', 'warn')
    updateSettings({ people: people.map((x) => (x.id === p.id ? { ...x, role: next } : x)) }, `Changed ${p.email} to ${next}`)
  }
  function remove(p) {
    if (p.role === 'admin' && admins <= 1) return toast('Keep at least one admin.', 'warn')
    updateSettings({ people: people.filter((x) => x.id !== p.id) }, `Removed access for ${p.email}`)
    toast(`Removed ${p.email}`)
  }

  return (
    <Card title="People with access" hint="Add someone by email and choose their role. Reviewers work the review queue; admins can also change set-up.">
      <form onSubmit={add} className="access-add" noValidate>
        <Field label="Email address">{(id) => <input id={id} type="email" inputMode="email" autoComplete="off" placeholder="name@company.com" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} />}</Field>
        <Field label="Role">{(id) => <select id={id} value={role} onChange={(e) => setRole(e.target.value)}><option value="reviewer">Reviewer</option><option value="admin">Admin</option></select>}</Field>
        <button className="btn primary" type="submit">Give access</button>
      </form>
      {error && <div className="outcome red" role="alert" style={{ marginTop: 8 }}><div>{error}</div></div>}
      <div className="list" style={{ marginTop: 14 }}>
        {people.length === 0 && <p className="muted small">No one has been added yet.</p>}
        {people.map((p) => (
          <div key={p.id} className="item access-person" style={{ cursor: 'default' }}>
            <div className="body"><div className="cell-title">{p.email}</div></div>
            <select aria-label={`Role for ${p.email}`} value={p.role} onChange={(e) => changeRole(p, e.target.value)}>
              <option value="reviewer">Reviewer</option><option value="admin">Admin</option>
            </select>
            <button className="btn small danger" onClick={() => remove(p)}>Remove</button>
          </div>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 12 }}>Test environment: this list is saved in this browser only and no invitation email is sent. In the installed version, each person signs in with their email and a password.</p>
    </Card>
  )
}

export default function Access() {
  const { settings, updateSettings, serverMode } = useApp()
  const access = accessOf(settings)
  const openCount = REVIEWER_PAGES.filter((p) => access[p.key]).length
  const set = (key, on) => {
    const page = REVIEWER_PAGES.find((p) => p.key === key)
    updateSettings({ reviewerAccess: { ...access, [key]: on } }, `Reviewers ${on ? 'can now open' : 'can no longer open'} ${page.label}`)
  }

  return (
    <>
      <PageHeader title="Access" subtitle="Who can use the help desk, and what reviewers can see." />

      {serverMode ? <TeamCard /> : <PeopleCard />}

      <div style={{ marginTop: 16 }} />
      <Card className="reviewer-pages" title="What reviewers can open" hint={`Reviewers can open ${openCount} of ${REVIEWER_PAGES.length} optional pages. Changes apply right away.`}>
        <div className="always-row">
          <Icon name="check" size={14} /><span><strong>Always open:</strong> Review queue and Getting started.</span>
        </div>
        <div className="always-row">
          <Icon name="lock" size={14} /><span><strong>Always admin-only:</strong> Settings and this Access page.</span>
        </div>
        <div style={{ marginTop: 14 }}>
          {REVIEWER_PAGES.map((p) => (
            <SettingRow key={p.key} title={<>{p.label} {access[p.key] ? <Badge tone="green">Open</Badge> : <Badge>Hidden</Badge>}</>} hint={p.hint}>
              <Toggle label={`Reviewers can open ${p.label}`} checked={!!access[p.key]} onChange={(on) => set(p.key, on)} />
            </SettingRow>
          ))}
        </div>
        <div className="guardrail" role="note" style={{ marginTop: 12 }}><Icon name="lock" /><div>Opening a page lets reviewers look at it. Only admins can change the workflow, knowledge files or settings.</div></div>
      </Card>
    </>
  )
}
