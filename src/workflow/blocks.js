// What every block is: its name, colour group, connection points ("ports"), starting settings,
// a one-line summary shown on the block, and plain-language help shown in the side panel.
import { CATEGORIES } from '../data/defaults'

export const GROUPS = {
  start: { label: 'Start', color: '#1b3a5c' },
  ai: { label: 'AI', color: '#5b4b8a' },
  filter: { label: 'Filters', color: '#8a5a0a' },
  logic: { label: 'Logic', color: '#1f6f78' },
  action: { label: 'Actions', color: '#3b6b45' },
  end: { label: 'Finish', color: '#7a2f2f' },
}

// ---- Conditions (used by If and While) ----
export const FIELDS = {
  confidence: { label: 'AI confidence (%)', type: 'number', help: 'How sure the AI is about its reply. Set after a Write reply block.' },
  topic: { label: 'Topic', type: 'topic', help: 'What the email is about.' },
  riskLevel: { label: 'Highest risk found', type: 'risk', help: 'The most serious flag raised so far.' },
  flagged: { label: 'Any risk flagged', type: 'yesno', help: 'Whether any Risk filter has matched so far.' },
  flaggedRule: { label: 'Risk rule that matched', type: 'text', help: 'The name of a rule that matched, for example "Harassment".' },
  sourcesFound: { label: 'Supporting document found', type: 'yesno', help: 'Whether the reply is backed by a quote from your documents.' },
  senderEmail: { label: 'Sender email', type: 'text', help: '' },
  senderDomain: { label: 'Sender email domain', type: 'text', help: 'The part after the @ sign.' },
  subject: { label: 'Subject', type: 'text', help: '' },
  body: { label: 'Message text', type: 'text', help: '' },
  hour: { label: 'Hour received (0-23)', type: 'number', help: 'Use this for business hours, for example hour is below 8.' },
  tries: { label: 'Replies written so far', type: 'number', help: 'How many times a Write reply block has run for this email.' },
  repliesToSender: { label: 'Auto replies to this sender in 24h', type: 'number', help: 'Stops back-and-forth loops with one person.' },
}
export const OPS = {
  number: [['=', 'is'], ['!=', 'is not'], ['>', 'is more than'], ['>=', 'is at least'], ['<', 'is less than'], ['<=', 'is at most']],
  text: [['contains', 'contains'], ['not_contains', 'does not contain'], ['is', 'is exactly'], ['starts', 'starts with']],
  topic: [['is', 'is'], ['is_not', 'is not'], ['in', 'is one of']],
  risk: [['is', 'is'], ['is_not', 'is not'], ['at_least', 'is at least']],
  yesno: [['is', 'is']],
}
export const RISK_LEVELS = ['none', 'medium', 'high', 'critical']
export const newCondition = () => ({ field: 'confidence', op: '>=', value: 80 })
export const defaultValue = (field) => {
  const t = FIELDS[field].type
  return t === 'number' ? 0 : t === 'topic' ? 'time_off' : t === 'risk' ? 'high' : t === 'yesno' ? 'yes' : ''
}
export function describeCondition(c) {
  const f = FIELDS[c.field]
  if (!f) return 'unknown condition'
  const op = (OPS[f.type].find((o) => o[0] === c.op) || [c.op, c.op])[1]
  let v = c.value
  if (f.type === 'topic') v = (Array.isArray(v) ? v : [v]).map((x) => CATEGORIES.find((k) => k.id === x)?.label || x).join(' or ')
  if (f.type === 'text') v = `"${v}"`
  return `${f.label} ${op} ${v === '' ? '(blank)' : v}`
}
const joinText = (conds, join) => conds.length ? conds.map(describeCondition).join(join === 'any' ? '  OR  ' : '  AND  ') : 'No conditions yet'

const one = [{ id: 'out', label: '' }]

export const BLOCKS = {
  email_in: {
    title: 'Email received', group: 'start', icon: 'mail', hasInput: false, singleton: true, undeletable: true,
    ports: () => one, defaults: () => ({}),
    summary: () => 'Every incoming email starts here.',
    help: 'This is where every email begins. In production it is a ticket pulled from Zoro. Here, it is whatever you send from the Test Lab. Connect it to the first block that should look at the message.',
  },
  ai_understand: {
    title: 'Understand with AI', group: 'ai', icon: 'brain', ports: () => one, defaults: () => ({}),
    summary: () => 'Reads the message and works out the topic and any hidden risk.',
    help: 'The AI reads the whole message and decides what it is about. It also looks for risks by meaning, so a message that never uses the word "harassment" can still be caught. Place this before your Risk filters. Without it, filters only check for words.',
  },
  filter_flag: {
    title: 'Risk filter', group: 'filter', icon: 'flag',
    ports: () => [{ id: 'flagged', label: 'Flagged' }, { id: 'clear', label: 'Clear' }],
    defaults: () => ({ careful: true, semantic: true, rules: [{ id: `r_${Math.random().toString(36).slice(2, 7)}`, name: 'New rule', description: 'Describe the situation in plain words. The AI uses this to recognise it.', keywords: [], severity: 'high', notify: 'HR Business Partner' }] }),
    summary: (c) => `${c.rules.length} rule${c.rules.length === 1 ? '' : 's'}: ${c.rules.map((r) => r.name).slice(0, 3).join(', ')}${c.rules.length > 3 ? '...' : ''}`,
    help: 'Checks whether a message touches a sensitive subject, such as harassment or a legal threat. Each rule has trigger words and a plain description, so the AI can also catch it by meaning. Messages that match leave by the "Flagged" connector; everything else leaves by "Clear". Turn on "Careful reply" so the AI writes a cautious, no-advice draft for flagged messages.',
  },
  filter_text: {
    title: 'Text filter', group: 'filter', icon: 'search',
    ports: () => [{ id: 'match', label: 'Match' }, { id: 'nomatch', label: 'No match' }],
    defaults: () => ({ where: 'both', words: [], mode: 'any' }),
    summary: (c) => c.words.length ? `${c.mode === 'all' ? 'All of' : 'Any of'}: ${c.words.slice(0, 4).join(', ')}` : 'Add words to look for',
    help: 'A simple check for words in the subject, the message, or the sender address. Use it to spot spam, VIP senders, or a particular product. It does not mark the message as risky.',
  },
  if: {
    title: 'If / Else', group: 'logic', icon: 'branch',
    ports: () => [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
    defaults: () => ({ join: 'all', conditions: [newCondition()] }),
    summary: (c) => joinText(c.conditions, c.join),
    help: 'Asks a question and sends the message down one of two paths. You can combine several conditions with "all" (every one must be true) or "any" (one is enough). Example: if confidence is at least 80 and the topic is Time off, go to Yes.',
  },
  while: {
    title: 'While (repeat)', group: 'logic', icon: 'loop',
    ports: () => [{ id: 'loop', label: 'Repeat' }, { id: 'done', label: 'Done' }],
    defaults: () => ({ join: 'all', conditions: [{ field: 'confidence', op: '<', value: 80 }], maxLoops: 2 }),
    summary: (c) => `While ${joinText(c.conditions, c.join)} (up to ${c.maxLoops}x)`,
    help: 'Repeats a step while a condition is true. Connect "Repeat" to the block you want to run again (usually Write reply with AI), and connect that block back into this one so it loops. When the condition stops being true, or the maximum is reached, the message leaves by "Done". The maximum prevents endless loops.',
  },
  switch_topic: {
    title: 'Route by topic', group: 'logic', icon: 'split',
    ports: (c) => [...c.topics.map((id) => ({ id: `topic:${id}`, label: CATEGORIES.find((k) => k.id === id)?.label || id })), { id: 'else', label: 'Anything else' }],
    defaults: () => ({ topics: ['payroll', 'benefits'] }),
    summary: (c) => c.topics.length ? `${c.topics.length} topic path${c.topics.length === 1 ? '' : 's'} + anything else` : 'Choose topics',
    help: 'Gives each topic you choose its own exit, for example payroll to one path and benefits to another. Topics you do not choose leave by "Anything else". Topics come from the AI (or from keywords if there is no AI block).',
  },
  ai_draft: {
    title: 'Write reply with AI', group: 'ai', icon: 'pen', ports: () => one, defaults: () => ({ tone: 'default' }),
    summary: (c) => `Tone: ${c.tone === 'default' ? 'from Settings' : c.tone}`,
    help: 'The AI writes the reply using only your Knowledge files and quotes its sources. If a Risk filter marked the message as careful, the AI writes a short, warm, no-advice reply instead. Placing it again after a While block lets the AI try again, using the previous attempt as a hint.',
  },
  alert: {
    title: 'Send alert', group: 'action', icon: 'bell', ports: () => one, defaults: () => ({ role: 'HR Director', message: 'A message needs attention.' }),
    summary: (c) => `To ${c.role}`,
    help: 'Notifies a person or team without ending the case. For now alerts appear in this tool (the case and the Activity log). The message then carries on to the next block.',
  },
  email_out: {
    title: 'Email sent', group: 'end', icon: 'send', ports: () => [], defaults: () => ({ requireApproval: true }),
    summary: (c) => (c.requireApproval ? 'Ready to send, a person approves first' : 'Sends automatically'),
    help: 'Sends the written reply to the employee (through the Zoro ticket in production). Leave "A person approves first" on to place the reply in the Review queue as ready to send. Turn it off to send automatically. If no reply has been written yet, the message is held for a person instead.',
  },
  review: {
    title: 'Send to review queue', group: 'end', icon: 'inbox', ports: () => [], defaults: () => ({ priority: 'normal', requireConfirm: false }),
    summary: (c) => `${c.priority === 'urgent' ? 'Urgent. ' : ''}${c.requireConfirm ? 'Reviewer must confirm' : 'Reviewer edits and sends'}`,
    help: 'Places the case and the AI draft in the Review queue for a person to read, edit and send. "Reviewer must confirm" adds a tick box that has to be ticked before Send turns on. It is always required for careful, high-risk replies.',
  },
  assign: {
    title: 'Escalate / assign owner', group: 'end', icon: 'user', ports: () => [], defaults: () => ({ owner: 'HR Director', priority: 'urgent', requireConfirm: true }),
    summary: (c) => `Owner: ${c.owner}`,
    help: 'Marks the case as escalated and suggests who should own it. It appears at the top of the Review queue. Any draft is kept for the owner to rewrite.',
  },
  close: {
    title: 'Close without reply', group: 'end', icon: 'close', ports: () => [], defaults: () => ({ reason: 'No reply needed' }),
    summary: (c) => c.reason || 'Ends the case',
    help: 'Ends the case without any reply, for example spam or an out-of-scope message. The email stays in the Review queue under "Handled".',
  },
}

export const PALETTE = [
  { label: 'Understand and write', kinds: ['ai_understand', 'ai_draft'] },
  { label: 'Filters', kinds: ['filter_flag', 'filter_text'] },
  { label: 'Logic', kinds: ['if', 'while', 'switch_topic'] },
  { label: 'Actions', kinds: ['alert'] },
  { label: 'Finish the case', kinds: ['email_out', 'review', 'assign', 'close'] },
]

export const portsOf = (node) => BLOCKS[node.data.kind].ports(node.data.config)
export const titleOf = (node) => node.data.label || BLOCKS[node.data.kind].title
