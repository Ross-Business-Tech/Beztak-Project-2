// Made-up sample employee handbook for a fictional company. Not real policy.
export const COMPANY = 'Northgate Realty Partners'

export const TOPICS = [
  {
    id: 'pto',
    title: 'Paid Time Off (PTO)',
    section: 'Handbook §4.1',
    keywords: ['pto', 'paid time off', 'vacation', 'time off', 'days off', 'day off', 'personal day', 'leave balance'],
    answer: [
      'Full-time employees earn 15 days of PTO per year (1.25 days per month).',
      'Request PTO in the Employee Portal at least 2 weeks ahead for anything longer than 2 days.',
      'Your manager approves requests within 3 business days.',
    ],
    followups: [
      { keywords: ['carry', 'rollover', 'roll over', 'unused', 'next year', 'expire'], answer: ['You can carry over up to 5 unused PTO days into the next year. Anything above 5 days expires on December 31.'] },
      { keywords: ['part time', 'part-time', 'hourly'], answer: ['Part-time employees earn PTO prorated to their scheduled hours (for example, 20 hrs/week earns 7.5 days per year).'] },
      { keywords: ['new hire', 'just started', 'first', 'probation', '90 days'], answer: ['New hires earn PTO from day one, and can use it after 90 days of employment.'] },
      { keywords: ['quit', 'leave the company', 'resign', 'payout', 'paid out', 'cash out'], answer: ['Unused, accrued PTO (up to 10 days) is paid out in your final paycheck if you leave the company.'] },
      { keywords: ['balance', 'how many do i have', 'have left', 'remaining'], answer: ['Your current PTO balance is on the "Time Off" tab of the Employee Portal. If it looks wrong, I can send it to HR.'] },
    ],
  },
  {
    id: 'sick',
    title: 'Sick Leave',
    section: 'Handbook §4.2',
    keywords: ['sick', 'ill', 'doctor', 'flu', 'covid', 'medical appointment', 'unwell'],
    answer: [
      'Every employee gets 6 paid sick days per year, separate from PTO.',
      'Tell your manager before your shift starts if you are out sick.',
    ],
    followups: [
      { keywords: ['note', 'doctor note', 'proof'], answer: ['A doctor\'s note is only needed after 3 or more sick days in a row.'] },
      { keywords: ['family', 'child', 'kid', 'parent', 'spouse'], answer: ['Yes, sick days can be used to care for a sick child, spouse or parent.'] },
      { keywords: ['carry', 'rollover', 'unused'], answer: ['Sick days do not carry over and are not paid out.'] },
      { keywords: ['longer', 'surgery', 'weeks', 'fmla', 'extended'], answer: ['For a longer medical absence you may qualify for protected medical leave. That depends on your situation, so HR should review it with you.'], escalate: 'Medical leave' },
    ],
  },
  {
    id: 'holidays',
    title: 'Company Holidays',
    section: 'Handbook §4.3',
    keywords: ['holiday', 'holidays', 'christmas', 'thanksgiving', 'new year', 'july 4', 'memorial day', 'labor day', 'office closed'],
    answer: [
      'The company observes 10 paid holidays: New Year\'s Day, MLK Day, Memorial Day, Juneteenth, July 4, Labor Day, Thanksgiving and the day after, Christmas Eve and Christmas Day.',
    ],
    followups: [
      { keywords: ['work', 'on site', 'property', 'have to', 'scheduled'], answer: ['Property staff scheduled to work a holiday are paid 1.5x their regular rate and get a floating day off.'] },
      { keywords: ['floating', 'religious', 'observe'], answer: ['Everyone also gets 1 floating holiday per year to use for a day that matters to them.'] },
    ],
  },
  {
    id: 'benefits',
    title: 'Health Benefits',
    section: 'Handbook §5.1',
    keywords: ['benefit', 'benefits', 'health insurance', 'insurance', 'medical plan', 'dental', 'vision', 'enroll', 'enrollment', 'coverage'],
    answer: [
      'Full-time employees can choose medical, dental and vision plans. The company pays 80% of the employee premium.',
      'You must enroll within 30 days of your start date. Open enrollment is every November.',
    ],
    followups: [
      { keywords: ['spouse', 'family', 'kids', 'children', 'dependent', 'partner'], answer: ['You can add a spouse, domestic partner and children up to age 26. The company pays 60% of dependent premiums.'] },
      { keywords: ['married', 'baby', 'birth', 'life event', 'change my'], answer: ['After a life event (marriage, birth, adoption) you have 30 days to change your plan in the Employee Portal.'] },
      { keywords: ['part time', 'part-time'], answer: ['Part-time employees working 30+ hours per week are eligible for benefits.'] },
      { keywords: ['claim', 'denied', 'bill'], answer: ['Claim problems are personal, so an HR benefits specialist should look into it.'], escalate: 'Benefits claim' },
    ],
  },
  {
    id: 'retirement',
    title: '401(k) Retirement Plan',
    section: 'Handbook §5.2',
    keywords: ['401k', '401(k)', 'retirement', 'match', 'pension'],
    answer: [
      'The company matches 100% of what you contribute, up to 4% of your pay.',
      'You are eligible after 60 days, and the company match is yours right away (fully vested).',
    ],
    followups: [
      { keywords: ['change', 'contribution', 'increase', 'decrease'], answer: ['You can change your contribution any time in the Employee Portal under "Retirement". Changes start on the next paycheck.'] },
      { keywords: ['roth'], answer: ['Yes, a Roth 401(k) option is available, and the company match applies to it as well.'] },
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll & Pay Day',
    section: 'Handbook §6.1',
    keywords: ['pay', 'paycheck', 'payday', 'pay day', 'payroll', 'pay stub', 'paystub', 'direct deposit', 'w-2', 'w2', 'salary'],
    answer: [
      'You are paid every other Friday by direct deposit.',
      'Pay stubs and W-2 forms are in the Employee Portal under "Pay".',
    ],
    followups: [
      { keywords: ['bank', 'account', 'change', 'update'], answer: ['Update your direct deposit account in the Employee Portal. Changes made by Monday apply to that week\'s paycheck.'] },
      { keywords: ['holiday', 'falls on'], answer: ['If payday falls on a holiday, you are paid the business day before.'] },
      { keywords: ['raise', 'increase'], answer: ['Pay increases are reviewed during the annual performance review in January.'] },
    ],
  },
  {
    id: 'overtime',
    title: 'Hours & Overtime',
    section: 'Handbook §6.2',
    keywords: ['overtime', 'hours', 'timesheet', 'clock in', 'clock out', 'break', 'lunch', 'schedule'],
    answer: [
      'Hourly employees earn 1.5x pay for hours over 40 in a week. Overtime must be approved by your manager first.',
      'Record all hours in the time clock app. You get a 30-minute unpaid lunch for shifts over 6 hours.',
    ],
    followups: [
      { keywords: ['forgot', 'missed', 'fix'], answer: ['If you forgot to clock in or out, ask your manager to correct it in the time clock app before Monday at noon.'] },
      { keywords: ['salary', 'salaried', 'exempt'], answer: ['Salaried (exempt) employees do not earn overtime pay.'] },
    ],
  },
  {
    id: 'remote',
    title: 'Hybrid & Remote Work',
    section: 'Handbook §7.1',
    keywords: ['remote', 'work from home', 'wfh', 'hybrid', 'telework', 'in the office', 'in office'],
    answer: [
      'Corporate office staff may work from home up to 2 days per week, with manager approval.',
      'Leasing and maintenance roles are on-site at their property every scheduled shift.',
    ],
    followups: [
      { keywords: ['equipment', 'laptop', 'monitor', 'internet', 'stipend'], answer: ['Hybrid employees get a company laptop and a $40/month internet stipend.'] },
      { keywords: ['fully', 'full time', 'every day', 'another state', 'move'], answer: ['Fully remote arrangements are approved case by case, so HR needs to review that request.'], escalate: 'Remote work request' },
    ],
  },
  {
    id: 'dress',
    title: 'Dress Code',
    section: 'Handbook §7.2',
    keywords: ['dress code', 'dress', 'wear', 'attire', 'uniform', 'jeans', 'clothes', 'clothing'],
    answer: [
      'Corporate offices are business casual. Jeans are fine on Fridays.',
      'Leasing and maintenance teams wear the company uniform, provided free.',
    ],
    followups: [
      { keywords: ['replace', 'more', 'new uniform', 'extra'], answer: ['You get 5 uniform shirts per year. Ask your property manager for replacements.'] },
      { keywords: ['shoes', 'boots', 'safety'], answer: ['Maintenance staff get a $100 yearly reimbursement for safety boots.'] },
    ],
  },
  {
    id: 'expenses',
    title: 'Expense Reimbursement',
    section: 'Handbook §8.1',
    keywords: ['expense', 'expenses', 'reimburse', 'reimbursement', 'mileage', 'receipt', 'travel', 'company card'],
    answer: [
      'Submit expenses with receipts in the Expense app within 30 days.',
      'Mileage for driving between properties is paid at the standard IRS rate.',
    ],
    followups: [
      { keywords: ['how long', 'when', 'paid back'], answer: ['Approved expenses are paid on your next paycheck.'] },
      { keywords: ['lost', 'no receipt'], answer: ['Without a receipt, fill out a "Missing Receipt" form for anything under $75. Above that, your manager must approve.'] },
    ],
  },
  {
    id: 'parental',
    title: 'Parental Leave',
    section: 'Handbook §4.4',
    keywords: ['parental', 'maternity', 'paternity', 'pregnant', 'pregnancy', 'baby', 'adoption', 'adopt', 'new child'],
    answer: [
      'Primary caregivers get 8 weeks of fully paid parental leave. Secondary caregivers get 4 weeks.',
      'It applies to birth, adoption and foster placement after 6 months of employment.',
    ],
    followups: [
      { keywords: ['when', 'notice', 'how far', 'apply', 'start'], answer: ['Let HR know at least 30 days before your leave when possible. HR will set up the paperwork with you.'], escalate: 'Parental leave planning' },
      { keywords: ['split', 'part', 'break up'], answer: ['Leave can be taken all at once or in 2 blocks within 12 months of the birth or placement.'] },
    ],
  },
  {
    id: 'bereavement',
    title: 'Bereavement Leave',
    section: 'Handbook §4.5',
    keywords: ['bereavement', 'funeral', 'passed away', 'death', 'died', 'loss of'],
    answer: [
      'We are sorry for your loss. You get up to 5 paid days for the death of an immediate family member, and 2 days for extended family or a close friend.',
      'Just let your manager know. No paperwork is needed up front.',
    ],
    followups: [
      { keywords: ['more time', 'longer', 'extra'], answer: ['You can add PTO, or talk with HR about unpaid time. We can connect you with someone.'], escalate: 'Bereavement support' },
      { keywords: ['counsel', 'talk to someone', 'grief'], answer: ['The Employee Assistance Program offers free, confidential counseling 24/7 at 1-800-555-0199 (sample number).'] },
    ],
  },
  {
    id: 'housing',
    title: 'Employee Housing Discount',
    section: 'Handbook §5.4',
    keywords: ['housing', 'apartment', 'rent', 'discount', 'live at', 'lease', 'unit'],
    answer: [
      'Employees get 20% off rent at any company-managed community, after 90 days of employment.',
      'Apply through the leasing office of the community you want, and mention the employee program.',
    ],
    followups: [
      { keywords: ['leave the company', 'quit', 'terminate', 'move out'], answer: ['If you leave the company, the discount ends at the end of your current lease term.'] },
      { keywords: ['family', 'roommate', 'parent'], answer: ['The discount applies only to units where the employee is on the lease and lives there.'] },
    ],
  },
  {
    id: 'tuition',
    title: 'Tuition Assistance',
    section: 'Handbook §5.5',
    keywords: ['tuition', 'school', 'degree', 'college', 'certification', 'course', 'class', 'education', 'training'],
    answer: [
      'The company reimburses up to $5,250 per year for job-related classes, degrees and real estate certifications (like CAM or CAPS).',
      'Get your manager\'s approval before enrolling.',
    ],
    followups: [
      { keywords: ['grade', 'pass', 'fail'], answer: ['You must pass the class with a C or better to be reimbursed.'] },
      { keywords: ['leave the company', 'quit', 'pay back', 'repay'], answer: ['If you leave within 12 months of reimbursement, you may need to pay it back.'] },
    ],
  },
  {
    id: 'reviews',
    title: 'Performance Reviews',
    section: 'Handbook §9.1',
    keywords: ['review', 'performance', 'evaluation', 'feedback', 'goals', 'promotion'],
    answer: [
      'Annual performance reviews happen in January, with a mid-year check-in in July.',
      'Your manager will set goals with you in the Employee Portal.',
    ],
    followups: [
      { keywords: ['disagree', 'unfair', 'appeal', 'dispute'], answer: ['If you disagree with your review, you can add written comments and ask HR to review it.'], escalate: 'Performance review dispute' },
      { keywords: ['promotion', 'promoted', 'apply', 'internal', 'job'], answer: ['Internal openings are posted on the Careers page first. You can apply after 6 months in your current role.'] },
    ],
  },
]

// Words that mean a real person in HR must look at the conversation.
export const SENSITIVE = [
  { label: 'Harassment', terms: ['harass', 'sexual', 'inappropriate touch', 'touched me', 'unwanted', 'hostile work', 'bully', 'bullied', 'creepy', 'stalk'] },
  { label: 'Discrimination', terms: ['discriminat', 'racist', 'racism', 'sexist', 'because of my race', 'because of my age', 'because i am pregnant', 'because of my religion', 'because i\'m gay', 'because of my disability'] },
  { label: 'Retaliation', terms: ['retaliat', 'punished for reporting', 'fired for complaining', 'whistleblow'] },
  { label: 'Workplace safety', terms: ['threat', 'violence', 'violent', 'weapon', 'gun', 'assault', 'attacked', 'unsafe', 'injured', 'injury', 'hurt at work', 'accident'] },
  { label: 'Wellbeing', terms: ['suicid', 'self harm', 'self-harm', 'hurt myself', 'kill myself', 'abuse', 'domestic'] },
  { label: 'Legal', terms: ['lawyer', 'attorney', 'lawsuit', 'sue ', 'legal action', 'eeoc'] },
  { label: 'Ethics / fraud', terms: ['fraud', 'stealing', 'theft', 'bribe', 'kickback', 'embezzl'] },
  { label: 'Substance use', terms: ['drunk', 'intoxicated', 'drugs at work', 'high at work'] },
]

const HUMAN_REQUEST = ['human', 'real person', 'a person', 'someone in hr', 'talk to hr', 'speak to hr', 'hr rep', 'representative', 'call me', 'manager of hr', 'escalate']
const PERSONAL_PROBLEM = /\b(my|i)\b.*\b(wrong|incorrect|missing|mistake|error|short|didn'?t (get|receive)|never (got|received)|not (paid|received)|overcharged|denied)\b/
const FOLLOWUP_CUE = /^(and|what about|how about|what if|also|does|do|is|are|can|could|how|when|what|so|ok|okay)\b/

function norm(text) {
  return ` ${text.toLowerCase().replace(/[’']/g, '\'').replace(/[^a-z0-9'()\- ]+/g, ' ').replace(/\s+/g, ' ')} `
}

function hits(text, keywords) {
  let score = 0
  for (const k of keywords) {
    // Match at a word start so "pay" doesn't match "repay", but "harass" matches "harassment".
    if (text.includes(` ${k}`)) score += k.length >= 4 ? 2 : 1
  }
  return score
}

export function detectSensitive(message) {
  const text = norm(message)
  return SENSITIVE.filter((c) => c.terms.some((t) => text.includes(` ${t}`))).map((c) => c.label)
}

/**
 * Decide how the assistant responds.
 * context: { topicId, misses, openTicketId }
 * Returns { kind, text: string[], topic?, flags?, escalateReason?, nextContext }
 */
export function respond(message, context) {
  const text = norm(message)
  const flags = detectSensitive(message)

  if (flags.length) {
    return { kind: 'flag', flags, nextContext: { ...context, misses: 0 } }
  }

  if (hits(text, HUMAN_REQUEST)) {
    return { kind: 'human', escalateReason: 'Employee asked to talk with HR', nextContext: { ...context, misses: 0 } }
  }

  if (PERSONAL_PROBLEM.test(text)) {
    return { kind: 'personal', escalateReason: 'Problem with personal records', nextContext: { ...context, misses: 0 } }
  }

  const current = TOPICS.find((t) => t.id === context.topicId)

  // 1. A follow-up about the topic we're already discussing.
  if (current) {
    let best = null
    let bestScore = 0
    for (const f of current.followups) {
      const s = hits(text, f.keywords)
      if (s > bestScore) { best = f; bestScore = s }
    }
    const newTopicScore = Math.max(0, ...TOPICS.filter((t) => t.id !== current.id).map((t) => hits(text, t.keywords)))
    if (best && bestScore > newTopicScore) {
      return { kind: best.escalate ? 'answer-escalate' : 'answer', topic: current, text: best.answer, escalateReason: best.escalate, nextContext: { ...context, topicId: current.id, misses: 0 } }
    }
  }

  // 2. A new question matching a handbook topic.
  let topic = null
  let topicScore = 0
  for (const t of TOPICS) {
    const s = hits(text, t.keywords)
    if (s > topicScore) { topic = t; topicScore = s }
  }
  if (topic) {
    // A follow-up keyword in the same message (e.g. "can I carry over vacation?") gets the specific answer too.
    const extra = topic.followups.find((f) => hits(text, f.keywords))
    const body = extra ? [...topic.answer, ...extra.answer] : topic.answer
    return { kind: extra?.escalate ? 'answer-escalate' : 'answer', topic, text: body, escalateReason: extra?.escalate, nextContext: { ...context, topicId: topic.id, misses: 0 } }
  }

  // 3. Looks like a follow-up we can't answer from the handbook.
  const misses = (context.misses || 0) + 1
  if (current && FOLLOWUP_CUE.test(text.trim())) {
    return { kind: 'unsure-followup', topic: current, nextContext: { ...context, misses } }
  }
  return { kind: misses >= 2 ? 'unknown-escalate' : 'unknown', nextContext: { ...context, topicId: null, misses } }
}
