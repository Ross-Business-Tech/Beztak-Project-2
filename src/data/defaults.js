// Starting settings, flag rules, sample documents and sample emails.
// All names, emails and policies here are made up.

export const CATEGORIES = [
  { id: 'time_off', label: 'Time off & PTO', keywords: ['pto', 'vacation', 'time off', 'days off', 'holiday', 'sick day', 'sick leave', 'leave balance', 'day off'] },
  { id: 'benefits', label: 'Benefits & insurance', keywords: ['benefit', 'insurance', 'health plan', 'dental', 'vision', '401k', '401(k)', 'enroll', 'enrollment', 'open enrollment', 'hsa', 'retirement'] },
  { id: 'payroll', label: 'Payroll & pay', keywords: ['paycheck', 'payroll', 'pay stub', 'paystub', 'direct deposit', 'salary', 'overtime', 'w-2', 'w2', 'tax withholding', 'bonus', 'paid'] },
  { id: 'leave', label: 'Parental & medical leave', keywords: ['parental leave', 'maternity', 'paternity', 'fmla', 'medical leave', 'bereavement', 'adoption', 'newborn', 'baby'] },
  { id: 'policy', label: 'Policies & handbook', keywords: ['policy', 'handbook', 'dress code', 'remote work', 'work from home', 'hybrid', 'code of conduct', 'expense', 'travel'] },
  { id: 'onboarding', label: 'Onboarding & new hires', keywords: ['onboarding', 'new hire', 'first day', 'start date', 'orientation', 'background check', 'equipment', 'laptop'] },
  { id: 'offboarding', label: 'Resignation & exit', keywords: ['resign', 'resignation', 'last day', 'notice period', 'final paycheck', 'exit interview', 'offboarding'] },
  { id: 'other', label: 'Other / general', keywords: [] },
]

export const SEVERITIES = [
  { id: 'critical', label: 'Critical' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
]

export const FILE_FOLDERS = ['Policies', 'Benefits', 'Payroll', 'Leave', 'Templates', 'Onboarding', 'Other']

export const DEFAULT_SETTINGS = {
  // How replies are routed (reply mode, flag rules, limits, business hours) now lives in the Workflow editor.
  tone: 'warm',
  helpDeskName: 'HR Help Desk',
  replyToAddress: 'hr-help@example.com',
  signature: 'Warm regards,\nThe HR Help Desk',
  footer: 'This reply was prepared with the help of an AI assistant. If anything looks off, just reply and a person from HR will follow up.',
  includeFooter: true,
  minutesSavedPerReply: 6,
  // 'ai' = real AI model (falls back to the simulation if unreachable); 'simulated' = word matching only
  ai: { engine: 'ai', model: 'anthropic/claude-sonnet-4.5' },
  integrations: {
    // Zoho Desk is the ticketing system: tickets come in from it and results go back to the ticket.
    //  enabled: pull new tickets (turn off to pause everything)
    //  applyTicketActions: let the workflow's status, tag and assign blocks change the ticket
    //  noteDraftOnArrival: save the AI draft as a private note on the ticket (never sent to the employee)
    //  onApprove: what happens when a person approves a reply: 'internal_note' (default), 'send_reply', or 'none'
    zoho: { enabled: false, applyTicketActions: true, noteDraftOnArrival: true, onApprove: 'internal_note' },
    // Egnyte: a folder of documents the AI may answer from (read-only, live server only)
    egnyte: { enabled: false, folderPath: '', includeSubfolders: true },
  },
}

export const DEFAULT_RULES = [
  {
    id: 'harassment', name: 'Harassment', severity: 'critical', action: 'escalate', enabled: true, builtin: true,
    description: 'Unwelcome behaviour, bullying, sexual harassment, inappropriate comments or touching.',
    keywords: ['harass', 'harassment', 'harassed', 'bullied', 'bullying', 'inappropriate touching', 'unwanted advances', 'sexual comments', 'hostile work environment', 'groped', 'stalking', 'inappropriate comments', 'inappropriate remarks'],
    notify: 'HR Director',
  },
  {
    id: 'discrimination', name: 'Discrimination', severity: 'critical', action: 'escalate', enabled: true, builtin: true,
    description: 'Treated unfairly because of race, gender, age, religion, disability, orientation, or another protected trait.',
    keywords: ['discriminat', 'racist', 'sexist', 'because of my race', 'because of my age', 'because i am pregnant', 'because of my religion', 'unequal pay because', 'ageism', 'homophobic'],
    notify: 'HR Director',
  },
  {
    id: 'retaliation', name: 'Retaliation & whistleblowing', severity: 'critical', action: 'escalate', enabled: true, builtin: true,
    description: 'Fear of punishment for reporting a problem, or reports of fraud or unethical behaviour.',
    keywords: ['retaliat', 'whistleblow', 'punished for reporting', 'fraud', 'falsifying', 'unethical', 'cooking the books', 'kickback'],
    notify: 'HR Director',
  },
  {
    id: 'safety', name: 'Violence & workplace safety', severity: 'critical', action: 'escalate', enabled: true, builtin: true,
    description: 'Threats, weapons, injuries or unsafe conditions.',
    keywords: ['threatened me', 'threat of violence', 'weapon', 'gun', 'unsafe', 'injured', 'injury at work', 'assault', 'fight at work', 'violent'],
    notify: 'Safety Officer',
  },
  {
    id: 'wellbeing', name: 'Mental health & crisis', severity: 'critical', action: 'escalate', enabled: true, builtin: true,
    description: 'Signs that someone may be in distress or at risk.',
    keywords: ['suicid', 'self-harm', 'self harm', 'hopeless', 'cannot go on', "can't go on", 'want to die', 'panic attack', 'severe anxiety', 'burned out and breaking'],
    notify: 'HR Director',
  },
  {
    id: 'legal', name: 'Legal threats', severity: 'high', action: 'escalate', enabled: true, builtin: true,
    description: 'Lawyers, lawsuits, regulators, or formal complaints.',
    keywords: ['lawyer', 'attorney', 'lawsuit', 'sue ', 'suing', 'eeoc', 'labor board', 'legal action', 'union', 'subpoena', 'wrongful termination'],
    notify: 'Legal / HR Director',
  },
  {
    id: 'accommodation', name: 'Disability & accommodation', severity: 'high', action: 'hold', enabled: true, builtin: true,
    description: 'Medical conditions, ADA accommodation requests, or sensitive health details.',
    keywords: ['accommodation', 'disability', 'ada ', 'chronic condition', 'diagnosis', 'chemotherapy', 'pregnan', 'medical condition'],
    notify: 'Benefits Lead',
  },
  {
    id: 'termination', name: 'Termination & discipline', severity: 'high', action: 'hold', enabled: true, builtin: true,
    description: 'Being fired, laid off, put on a performance plan, or disciplined.',
    keywords: ['fired', 'terminated', 'laid off', 'layoff', 'performance improvement plan', 'pip ', 'written warning', 'disciplinary', 'severance'],
    notify: 'HR Business Partner',
  },
  {
    id: 'pay_dispute', name: 'Pay disputes & underpayment', severity: 'medium', action: 'hold', enabled: true, builtin: true,
    description: 'Claims of unpaid wages, wrong pay or unpaid overtime.',
    keywords: ['underpaid', 'unpaid wages', 'not paid', "wasn't paid", 'missing pay', 'unpaid overtime', 'wrong amount', 'pay is wrong', 'owed'],
    notify: 'Payroll Lead',
  },
  {
    id: 'immigration', name: 'Immigration & visa', severity: 'medium', action: 'hold', enabled: false, builtin: true,
    description: 'Work authorisation, visa sponsorship or status questions.',
    keywords: ['visa', 'h-1b', 'h1b', 'work permit', 'green card', 'sponsorship', 'opt ', 'immigration'],
    notify: 'Global Mobility',
  },
]

export const SAMPLE_FILES = [
  {
    id: 'f_pto', name: 'PTO-Policy.md', folder: 'Policies', size: 1420, type: 'text/markdown', active: true, test: false, extracted: true,
    description: 'How vacation, sick days and holidays work.',
    content: `# Paid Time Off (PTO) Policy

Full-time employees earn 1.5 PTO days per month (18 days per year). PTO accrues from the first day of employment and can be used after the first 30 days.

To request time off, submit a request in the HR portal at least two weeks ahead for anything longer than three days. Your manager approves or declines within two business days.

Up to 5 unused PTO days roll over into the next calendar year. Any days above that are lost on January 1.

Sick days are separate from PTO. Everyone receives 6 paid sick days per year. A doctor's note is only needed for absences of more than three days in a row.

The company observes 10 paid holidays per year. The holiday calendar is published each December.`,
  },
  {
    id: 'f_benefits', name: 'Benefits-Guide-2027.md', folder: 'Benefits', size: 1650, type: 'text/markdown', active: true, test: false, extracted: true,
    description: 'Health, dental, vision and retirement overview.',
    content: `# Benefits Guide 2027

Open enrollment runs from November 1 to November 15. During this window you can change your health, dental and vision plans. Outside open enrollment you can only make changes after a qualifying life event such as marriage, birth or adoption of a child, or loss of other coverage. You have 30 days after the event to update your plan.

Health insurance starts on the first day of the month after your start date. The company covers 80 percent of the employee premium and 50 percent of dependent premiums.

The 401(k) plan matches 100 percent of the first 4 percent you contribute. New hires are enrolled automatically at 3 percent after 60 days unless they opt out.

An HSA is available to anyone on the High Deductible plan. The company contributes 500 dollars each January.`,
  },
  {
    id: 'f_payroll', name: 'Payroll-Calendar.md', folder: 'Payroll', size: 980, type: 'text/markdown', active: true, test: false, extracted: true,
    description: 'Pay dates, cut-offs and direct deposit steps.',
    content: `# Payroll Calendar and FAQ

Employees are paid every second Friday. When a pay date falls on a holiday, payment is made on the previous business day.

Timesheets for hourly employees are due by 5 pm on the Monday before payday. Late timesheets are paid in the next cycle.

To change direct deposit details, update them in the HR portal under Pay and then Bank Accounts. Changes made after Wednesday of payday week take effect the following pay period.

Pay stubs and W-2 forms are available in the HR portal. W-2 forms are published by January 31 each year.`,
  },
  {
    id: 'f_leave', name: 'Parental-Leave-Policy.md', folder: 'Leave', size: 1210, type: 'text/markdown', active: true, test: false, extracted: true,
    description: 'Paid parental leave for birth, adoption and foster placement.',
    content: `# Parental Leave Policy

Eligible employees who have worked at the company for at least 6 months receive 12 weeks of paid parental leave for the birth, adoption or foster placement of a child. Leave must start within 12 months of the event.

Please tell HR and your manager at least 30 days before your planned leave start date. Notice can be shorter if the birth or placement is unexpected.

Benefits continue as normal during leave and your PTO continues to accrue. You can return to the same or an equivalent role.

Employees who are not yet eligible may still qualify for unpaid leave. HR will review each situation individually.`,
  },
  {
    id: 'f_remote', name: 'Remote-Work-Policy.md', folder: 'Policies', size: 870, type: 'text/markdown', active: true, test: false, extracted: true,
    description: 'Hybrid schedule expectations and home-office stipend.',
    content: `# Remote and Hybrid Work Policy

Most roles follow a hybrid schedule with three days per week in the office, normally Tuesday through Thursday. Fully remote arrangements need written approval from your manager and department head.

Employees working remotely receive a one-time home office stipend of 400 dollars. Submit receipts through the expense tool within 60 days.

Working from another state or country for more than two weeks requires advance approval from HR for tax and legal reasons.`,
  },
  {
    id: 'f_template', name: 'Reply-Templates.md', folder: 'Templates', size: 640, type: 'text/markdown', active: false, test: false, extracted: true,
    description: 'Archived: old reply wording, kept for reference.',
    content: `# Old reply templates (archived)

Thank you for your email. HR will respond within 5 business days.`,
  },
]

export const SCENARIOS = [
  { id: 's_pto', label: 'PTO rollover question', name: 'Priya Natarajan', from: 'priya.n@example.com', subject: 'How many PTO days roll over?', body: 'Hi HR,\n\nI have about 9 vacation days left this year. How many of those can I carry over into next year, and when do I lose the rest?\n\nThanks,\nPriya' },
  { id: 's_benefits', label: 'Open enrollment deadline', name: 'Marcus Webb', from: 'marcus.webb@example.com', subject: 'Open enrollment - when does it close?', body: 'Hello,\n\nCan you remind me when open enrollment ends? I want to switch to the dental plan with vision, and I also want to know about the 401k match.\n\nMarcus' },
  { id: 's_payroll', label: 'Direct deposit change', name: 'Elena Rossi', from: 'elena.rossi@example.com', subject: 'Changing my direct deposit', body: 'Hi,\n\nI opened a new bank account. How do I update my direct deposit and will it apply to this Friday paycheck?\n\nElena' },
  { id: 's_parental', label: 'Parental leave', name: 'Jordan Lee', from: 'jordan.lee@example.com', subject: 'Parental leave after adoption', body: 'Hello HR,\n\nMy partner and I are adopting a newborn next spring. How much parental leave do I get and how early do I have to tell you?\n\nJordan' },
  { id: 's_harass', label: 'Harassment report', name: 'Sam Carter', from: 'sam.carter@example.com', subject: 'Need to talk privately', body: "Hi,\n\nA coworker keeps making inappropriate comments about my appearance and yesterday it turned into unwanted advances. I feel harassed and I'm afraid of retaliation if I report it.\n\nSam" },
  { id: 's_legal', label: 'Legal threat', name: 'Chris Donovan', from: 'chris.d@example.com', subject: 'Final notice before I contact an attorney', body: 'To HR,\n\nI was terminated last week without explanation. I believe this was wrongful termination and I will be speaking with my attorney if I do not hear back by Friday.\n\nChris Donovan' },
  { id: 's_unknown', label: 'Question not in the documents', name: 'Aisha Khan', from: 'aisha.khan@example.com', subject: 'Pet insurance?', body: 'Hi team, does the company offer a discount on pet insurance or a pet bereavement day? Just curious!\nAisha' },
  { id: 's_wellbeing', label: 'Employee in distress', name: 'Taylor Brooks', from: 'taylor.b@example.com', subject: 'I am not doing ok', body: "I have been feeling hopeless for weeks and I don't know who to talk to. Work has been overwhelming.\n\nTaylor" },
]

// Sample emails shown on the dashboard so it is not empty. Offsets are minutes ago.
export const SEED_EMAILS = [
  { scenario: 's_pto', minutesAgo: 35 },
  { scenario: 's_benefits', minutesAgo: 120 },
  { scenario: 's_harass', minutesAgo: 190 },
  { scenario: 's_payroll', minutesAgo: 400 },
  { scenario: 's_unknown', minutesAgo: 1500 },
  { scenario: 's_parental', minutesAgo: 1700 },
  { scenario: 's_legal', minutesAgo: 2900 },
  { scenario: 's_pto', minutesAgo: 4300 },
  { scenario: 's_benefits', minutesAgo: 5800 },
]
