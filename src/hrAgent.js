// HRITT answer engine (demo). Everything here is made-up sample policy.
// It matches questions to a sample handbook, flags sensitive words for a human,
// remembers the last topic so follow-ups make sense, and decides when a person is needed.

export const MANUAL = [
  {
    id: 'pto',
    title: 'Paid time off (PTO)',
    keywords: ['pto', 'vacation', 'time off', 'holiday', 'annual leave', 'days off'],
    answer:
      'Full-time employees earn 1.25 PTO days per month (15 days in year one). Request time off in the HR portal at least two weeks ahead for trips longer than three days. Up to 5 unused days carry over each January.',
    section: 'Handbook §4.1 (sample)',
  },
  {
    id: 'sick',
    title: 'Sick leave',
    keywords: ['sick', 'illness', 'unwell', 'doctor', 'medical leave'],
    answer:
      'Employees get 8 paid sick days per calendar year. Tell your manager before your shift starts. A doctor’s note is needed only for absences longer than three days in a row.',
    section: 'Handbook §4.3 (sample)',
  },
  {
    id: 'parental',
    title: 'Parental leave',
    keywords: ['parental', 'maternity', 'paternity', 'newborn', 'adoption', 'baby'],
    answer:
      'Eligible employees get 16 weeks of paid parental leave, usable in the first 12 months after birth or placement. Submit the parental leave form at least 30 days before your leave starts.',
    section: 'Handbook §4.5 (sample)',
  },
  {
    id: 'remote',
    title: 'Remote and hybrid work',
    keywords: ['remote', 'hybrid', 'work from home', 'wfh', 'home office', 'office days'],
    answer:
      'Most teams use three office days and two remote days a week, set by each manager. Remote staff need a stable internet connection and must be reachable from 10:00 to 15:00 local time.',
    section: 'Handbook §6.2 (sample)',
  },
  {
    id: 'expenses',
    title: 'Expense reimbursement',
    keywords: ['expense', 'expenses', 'reimburse', 'reimbursement', 'receipt', 'mileage'],
    answer:
      'Submit expenses in the finance portal within 30 days of purchase, with itemized receipts. Approved claims are paid in the next payroll. Business travel meals are capped at $75 a day.',
    section: 'Handbook §7.1 (sample)',
  },
  {
    id: 'payroll',
    title: 'Payroll schedule',
    keywords: ['payroll', 'paycheck', 'payday', 'pay day', 'pay stub', 'paystub'],
    answer:
      'Pay is semi-monthly, on the 15th and the last business day of each month. Pay stubs appear in the HR portal on payday.',
    section: 'Handbook §5.1 (sample)',
  },
  {
    id: 'benefits',
    title: 'Benefits enrollment',
    keywords: ['benefits', 'health insurance', 'dental', 'vision', '401k', 'retirement'],
    answer:
      'New hires have 30 days from their start date to enroll in health, dental and vision plans. The company matches 401(k) contributions up to 4% of salary. Open enrollment runs each November.',
    section: 'Handbook §5.3 (sample)',
  },
  {
    id: 'training',
    title: 'Learning budget',
    keywords: ['training', 'course', 'certification', 'learning', 'conference'],
    answer:
      'Each employee has a $1,000 learning budget per year. Get a course approved by your manager first, then submit the receipt through the expense portal.',
    section: 'Handbook §8.2 (sample)',
  },
  {
    id: 'performance',
    title: 'Performance reviews',
    keywords: ['performance', 'review', 'appraisal', 'rating', 'promotion'],
    answer:
      'Reviews happen twice a year, in June and December. Each one has a self-assessment, a conversation with your manager, and goal-setting for the next period.',
    section: 'Handbook §8.1 (sample)',
  },
]

// Sensitive words that always go to a human. Matched as whole words.
const SENSITIVE = [
  { words: ['harassment', 'harass', 'harassed', 'harassing'], label: 'Harassment', urgency: 'High' },
  { words: ['discrimination', 'discriminated', 'discriminate'], label: 'Discrimination', urgency: 'High' },
  { words: ['retaliation', 'retaliate', 'retaliated'], label: 'Retaliation', urgency: 'High' },
  { words: ['bullying', 'bullied', 'intimidation', 'intimidate'], label: 'Bullying', urgency: 'High' },
  { words: ['misconduct', 'whistleblower'], label: 'Misconduct report', urgency: 'High' },
  { words: ['lawsuit', 'lawyer', 'sue'], label: 'Legal concern', urgency: 'High' },
  { words: ['injury', 'injured', 'accident'], label: 'Workplace injury', urgency: 'High' },
  { words: ['assault', 'abuse', 'abused', 'threat', 'threatened', 'unsafe', 'violence'], label: 'Safety or abuse', urgency: 'Urgent' },
]

const HUMAN_REQUEST =
  /\b(human|real person|a person|someone from hr|speak to (?:hr|someone|a person|a human)|talk to (?:hr|someone|a person|a human)|escalate)\b/i
const FRUSTRATED = /\b(not helpful|doesn'?t help|didn'?t help|wrong answer|useless)\b/i

export const SAMPLE_QUESTIONS = [
  'How much PTO do I get?',
  'When is payday?',
  'Can I work from home?',
  'What if a coworker is harassing me?',
  'Do I get a learning budget?',
  'Can I talk to a person?',
]

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hasWord = (text, phrase) => new RegExp(`\\b${escapeRe(phrase)}\\b`, 'i').test(text)

function matchTopic(lower) {
  let best = null
  let bestScore = 0
  for (const topic of MANUAL) {
    const score = topic.keywords.filter((k) => hasWord(lower, k)).length
    if (score > bestScore) {
      best = topic
      bestScore = score
    }
  }
  return best
}

// A follow-up leans on the last topic: "and for contractors?", "is that paid?", "what about part-time?"
const isFollowUp = (lower) =>
  /^(and|also|so|what about|how about|what if)\b/.test(lower) ||
  /\b(that|this|those|these|it|they|them|same|too|also)\b/.test(lower)

/**
 * askAgent(question, state) -> { reply, source, escalate, reasons, urgency, topic, misses }
 * state = { topic, misses } from the previous turn.
 */
export function askAgent(question, state) {
  const lower = question.trim().toLowerCase()
  const flags = SENSITIVE.filter((s) => s.words.some((w) => hasWord(lower, w)))
  const wantsHuman = HUMAN_REQUEST.test(lower) || FRUSTRATED.test(lower)

  let topic = matchTopic(lower)
  let followUp = false
  if (!topic && state.topic && !wantsHuman && isFollowUp(lower)) {
    topic = state.topic
    followUp = true
  }
  const misses = topic ? 0 : state.misses + 1

  const reasons = []
  if (flags.length) reasons.push(...flags.map((f) => f.label))
  if (wantsHuman) reasons.push('Employee asked for a person')
  if (!topic && misses >= 2) reasons.push('Two questions in a row are not in the handbook')
  const escalate = reasons.length > 0
  const urgency = flags.some((f) => f.urgency === 'Urgent') ? 'Urgent' : flags.length ? 'High' : escalate ? 'Normal' : null

  let reply
  let source = null
  if (flags.length) {
    reply =
      'I’m sorry you’re dealing with this. I can’t investigate it myself, so I’ve sent it to a human HR partner for confidential review.' +
      (urgency === 'Urgent' ? ' If you are in immediate danger, call local emergency services first.' : '') +
      ' You can also call the confidential HR line at ext. 4400 (sample number).'
  } else if (topic) {
    reply = followUp ? `Following up on ${topic.title.toLowerCase()}: ${topic.answer}` : topic.answer
    source = topic.section
  } else {
    reply =
      'I couldn’t find that in the sample handbook. Try asking about PTO, sick leave, payroll, benefits, remote work, expenses, learning budget or performance reviews.'
  }

  if (wantsHuman && !flags.length) reply += ' I’ve also passed your question to an HR partner, who will reply within one business day.'
  if (!topic && misses >= 2 && !flags.length) reply += ' Since I’ve missed twice, I’ve sent this to an HR partner too.'

  return {
    reply,
    source,
    escalate,
    reasons,
    urgency: escalate ? urgency || 'Normal' : null,
    topic: topic ?? state.topic,
    misses,
  }
}
