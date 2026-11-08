import { edge, makeDefaultWorkflow, node, rule } from './defaults'

const critical = () => node('n_critical', 'filter_flag', 600, 200, {
  careful: true, semantic: true, rules: ['harassment', 'discrimination', 'retaliation', 'safety', 'wellbeing', 'legal'].map(rule),
}, 'Critical risks')

/** Ready-made starting points. Each `make()` returns a fresh workflow. */
export const STARTER_TEMPLATES = [
  {
    id: 't_balanced', name: 'Balanced (the starter design)',
    description: 'Risky messages are escalated with a careful reply. Confident answers on safe topics are prepared for sending, but a person approves them first. Everything else goes to the review queue.',
    make: () => makeDefaultWorkflow(),
  },
  {
    id: 't_auto', name: 'Automatic with safeguards',
    description: 'The same design, but confident answers on safe topics are sent without a person. Risky messages still go to urgent review. Use this only once you trust the AI on your documents.',
    make: () => makeDefaultWorkflow({ autoSend: true }),
  },
  {
    id: 't_review_all', name: 'A person reviews everything',
    description: 'The AI drafts every reply, but nothing is ever sent without a person. Risky messages are flagged and alerted. The safest way to begin.',
    make: () => ({
      nodes: [
        node('n_in', 'email_in', 0, 200), node('n_understand', 'ai_understand', 290, 200), critical(),
        node('n_alert', 'alert', 920, 40, { role: 'HR Director', message: 'A high-risk message needs a person right away.' }),
        node('n_careful', 'ai_draft', 1220, 40, { tone: 'default' }, 'Write careful reply'),
        node('n_urgent', 'review', 1520, 40, { priority: 'urgent', requireConfirm: true }, 'Urgent review'),
        node('n_draft', 'ai_draft', 920, 330, { tone: 'default' }),
        node('n_review', 'review', 1220, 330, { priority: 'normal', requireConfirm: false }, 'Review draft'),
      ],
      edges: [
        edge('n_in', 'out', 'n_understand'), edge('n_understand', 'out', 'n_critical'),
        edge('n_critical', 'flagged', 'n_alert'), edge('n_alert', 'out', 'n_careful'), edge('n_careful', 'out', 'n_urgent'),
        edge('n_critical', 'clear', 'n_draft'), edge('n_draft', 'out', 'n_review'),
      ],
    }),
  },
  {
    id: 't_triage', name: 'Triage only (no AI replies)',
    description: 'The AI only reads and sorts. Risky messages are escalated to an owner and everything else goes to the review queue with no draft. Good while you build trust in the drafts.',
    make: () => ({
      nodes: [
        node('n_in', 'email_in', 0, 200), node('n_understand', 'ai_understand', 290, 200), critical(),
        node('n_assign', 'assign', 920, 40, { owner: 'HR Director', priority: 'urgent', requireConfirm: true }, 'Escalate to HR Director'),
        node('n_review', 'review', 920, 330, { priority: 'normal', requireConfirm: false }, 'Review queue'),
      ],
      edges: [
        edge('n_in', 'out', 'n_understand'), edge('n_understand', 'out', 'n_critical'),
        edge('n_critical', 'flagged', 'n_assign'), edge('n_critical', 'clear', 'n_review'),
      ],
    }),
  },
]
