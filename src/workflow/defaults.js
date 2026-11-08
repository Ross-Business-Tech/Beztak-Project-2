import { DEFAULT_RULES } from '../data/defaults'

const rule = (id) => {
  const r = DEFAULT_RULES.find((x) => x.id === id)
  return { id: r.id, name: r.name, description: r.description, keywords: r.keywords, severity: r.severity, notify: r.notify }
}
const node = (id, kind, x, y, config = {}, label = '') => ({ id, type: 'block', position: { x, y }, data: { kind, label, config } })
const edge = (source, sourceHandle, target) => ({ id: `e_${source}_${sourceHandle}_${target}`, source, sourceHandle, target, targetHandle: 'in' })

/** The starting workflow. `autoSend` lets the final Email sent block send without a person (used for sample data). */
export function makeDefaultWorkflow({ autoSend = false } = {}) {
  const nodes = [
    node('n_in', 'email_in', 0, 260),
    node('n_understand', 'ai_understand', 290, 260),
    node('n_critical', 'filter_flag', 600, 260, {
      careful: true, semantic: true,
      rules: ['harassment', 'discrimination', 'retaliation', 'safety', 'wellbeing', 'legal'].map(rule),
    }, 'Critical risks'),
    node('n_alert', 'alert', 920, 40, { role: 'HR Director', message: 'A high-risk message needs a person right away.' }),
    node('n_careful', 'ai_draft', 1220, 40, { tone: 'default' }, 'Write careful reply'),
    node('n_urgent', 'review', 1520, 40, { priority: 'urgent', requireConfirm: true }, 'Urgent review'),
    node('n_sensitive', 'filter_flag', 920, 330, {
      careful: false, semantic: true, rules: ['accommodation', 'termination', 'pay_dispute', 'immigration'].map(rule),
    }, 'Sensitive topics'),
    node('n_draft_s', 'ai_draft', 1220, 640, { tone: 'default' }, 'Write reply (sensitive)'),
    node('n_review_s', 'review', 1520, 640, { priority: 'normal', requireConfirm: false }, 'Review sensitive'),
    node('n_draft', 'ai_draft', 1220, 330, { tone: 'default' }),
    node('n_while', 'while', 1520, 330, { join: 'all', conditions: [{ field: 'confidence', op: '<', value: 80 }], maxLoops: 2 }, 'Try again if unsure'),
    node('n_if', 'if', 1840, 330, {
      join: 'all',
      conditions: [
        { field: 'confidence', op: '>=', value: 80 },
        { field: 'topic', op: 'in', value: ['time_off', 'benefits', 'policy', 'onboarding'] },
        { field: 'sourcesFound', op: 'is', value: 'yes' },
      ],
    }, 'Safe to send?'),
    node('n_out', 'email_out', 2160, 250, { requireApproval: !autoSend }),
    node('n_review', 'review', 2160, 440, { priority: 'normal', requireConfirm: false }),
  ]
  const edges = [
    edge('n_in', 'out', 'n_understand'),
    edge('n_understand', 'out', 'n_critical'),
    edge('n_critical', 'flagged', 'n_alert'),
    edge('n_alert', 'out', 'n_careful'),
    edge('n_careful', 'out', 'n_urgent'),
    edge('n_critical', 'clear', 'n_sensitive'),
    edge('n_sensitive', 'flagged', 'n_draft_s'),
    edge('n_draft_s', 'out', 'n_review_s'),
    edge('n_sensitive', 'clear', 'n_draft'),
    edge('n_draft', 'out', 'n_while'),
    edge('n_while', 'loop', 'n_draft'),
    edge('n_while', 'done', 'n_if'),
    edge('n_if', 'yes', 'n_out'),
    edge('n_if', 'no', 'n_review'),
  ]
  return { nodes, edges }
}

/** All risk rules defined in a workflow (for the dashboard). */
export function rulesOf(workflow) {
  return workflow.nodes.filter((n) => n.data.kind === 'filter_flag').flatMap((n) => n.data.config.rules)
}
