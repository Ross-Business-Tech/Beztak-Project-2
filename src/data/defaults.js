// Starting settings, flag rules, sample documents and sample emails.
// All names, emails and policies here are made up.

export const CATEGORIES = [
  { id: 'leave', label: 'Medical & family leave', keywords: ['parental leave', 'maternity', 'paternity', 'fmla', 'medical leave', 'leave of absence', 'short term disability', 'short-term disability', 'disability papers', 'bereavement', 'adoption', 'newborn', 'baby', 'surgery', 'treatments', 'return to work', 'restrictions', 'limited duty', 'light duty'] },
  { id: 'time_off', label: 'Time off & PTO', keywords: ['pto', 'vacation', 'time off', 'days off', 'holiday', 'floating holiday', 'sick day', 'sick leave', 'leave balance', 'day off'] },
  { id: 'benefits', label: 'Benefits & insurance', keywords: ['benefit', 'insurance', 'health plan', 'dental', 'vision', '401k', '401(k)', 'enroll', 'enrollment', 'open enrollment', 'hsa', 'retirement', 'dependent', 'qualifying life event', 'special enrollment', 'turning 26', 'aging out', 'coverage'] },
  { id: 'payroll', label: 'Payroll & pay', keywords: ['paycheck', 'payroll', 'pay stub', 'paystub', 'direct deposit', 'salary', 'overtime', 'w-2', 'w2', 'tax withholding', 'bonus', 'paid', 'wage assignment', 'garnish', 'deduct', 'collections'] },
  { id: 'attendance', label: 'Attendance & call-offs', keywords: ['call off', 'call-off', 'called off', 'called in', 'no call', 'no show', 'doctor note', "doctor's note", 'doctors note', 'tardy', 'late to work', 'absent'] },
  { id: 'manager_request', label: 'Manager requests & paperwork', keywords: ['offer letter', 'job description', 'status change', 'demotion', 'promotion', 'pay increase', 'wage increase', 'hourly wage', 'job title', 'petty cash', 'corrective action', 'write up', 'write-up', 'termination', 'pip ', 'personnel'] },
  { id: 'paycor', label: 'Paycor & timecards', keywords: ['paycor', 'timecard', 'time card', 'punch', 'clock in', 'clock out', 'log in', 'login', 'password', 'portal', 'timekeeping', 'access'] },
  { id: 'policy', label: 'Policies & handbook', keywords: ['policy', 'handbook', 'dress code', 'remote work', 'work from home', 'hybrid', 'code of conduct', 'expense', 'travel', 'drug test', 'driving', 'golf cart'] },
  { id: 'onboarding', label: 'Onboarding & new hires', keywords: ['onboarding', 'new hire', 'first day', 'start date', 'orientation', 'background check', 'employment verification', 'equipment', 'laptop'] },
  { id: 'offboarding', label: 'Resignation & exit', keywords: ['resign', 'resignation', 'last day', 'notice period', 'final paycheck', 'exit interview', 'offboarding', 'turned in her keys', 'turned in his keys'] },
  { id: 'other', label: 'Other / general', keywords: [] },
]

export const SEVERITIES = [
  { id: 'critical', label: 'Critical' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
]

export const FILE_FOLDERS = ['Policies', 'Benefits', 'Payroll', 'Leave', 'Systems', 'Manager Guides', 'Templates', 'Onboarding', 'Other']

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
    // Zoro is the ticketing system: tickets come in from it and replies go back out through it.
    zoro: { enabled: false, serverUrl: '', pullTickets: true, sendReplies: true, replyAs: 'draft_note' },
  },
}

export const DEFAULT_RULES = [
  {
    id: 'harassment', name: 'Harassment', severity: 'critical', action: 'escalate', enabled: true, builtin: true,
    description: 'Unwelcome behaviour, bullying, sexual harassment, inappropriate comments or touching.',
    keywords: ['harass', 'harassment', 'harassed', 'bullied', 'bullying', 'inappropriate touching', 'unwanted advances', 'sexual comments', 'hostile work environment', 'hostile', 'targeting', 'targeted', 'intimidat', 'confronted me', 'groped', 'stalking'],
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
    keywords: ['accommodation', 'disability', 'ada ', 'chronic condition', 'diagnosis', 'chemotherapy', 'cancer', 'pregnan', 'medical condition', 'restrictions', 'limited duty', 'light duty'],
    notify: 'Benefits Lead',
  },
  {
    id: 'termination', name: 'Termination & discipline', severity: 'high', action: 'hold', enabled: true, builtin: true,
    description: 'Being fired, laid off, put on a performance plan, or disciplined.',
    keywords: ['fired', 'terminated', 'laid off', 'layoff', 'terminat', 'performance improvement plan', 'pip ', 'written warning', 'write up', 'write-up', 'corrective action', 'demotion', 'disciplinary', 'severance', 'arrested', 'dui', 'drug test'],
    notify: 'HR Business Partner',
  },
  {
    id: 'hardship', name: 'Personal hardship', severity: 'high', action: 'hold', enabled: true, builtin: true,
    description: 'Loss of housing, family emergencies, serious illness of a family member, or other urgent personal hardship where the person may need support resources.',
    keywords: ['evicted', 'eviction', 'homeless', 'lost my housing', 'no childcare', 'no other childcare', 'domestic violence', 'family emergency', 'severe health issues'],
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
    id: 'f_loa', name: 'Leave-of-Absence-FMLA-STD.md', folder: 'Leave', size: 2300, type: 'text/markdown', active: true, test: false, extracted: true,
    description: 'FMLA, personal leave of absence, short-term disability and returning to work.',
    content: `# Leave of Absence, FMLA and Short-Term Disability

FMLA eligibility: you can take up to 12 weeks of unpaid, job-protected leave under the Family and Medical Leave Act (FMLA) if you have worked here for at least 12 months and at least 1,250 hours in the 12 months before your leave starts. Eligibility is checked on the day the leave begins, so if you reach 12 months on or before your first day of leave, you can apply.

FMLA can be used for your own serious health condition, such as surgery and recovery, or to care for a spouse, child or parent with a serious health condition, such as cancer treatment. It can also be taken intermittently, for example one day a week for treatments.

To request FMLA or any leave of absence, email the HR Help Desk with your expected start date and how long you expect to be out. HR will send you the leave request form and a medical certification form for your doctor. The certification must be returned within 15 calendar days. Managers do not need to find or fill out the form for the employee.

Employees who are not eligible for FMLA, including part-time staff with fewer than 1,250 hours, can request a personal leave of absence. HR reviews these case by case and the manager is consulted about staffing.

Short-term disability (STD) pays part of your wages if you are unable to work because of your own illness, injury, surgery or pregnancy and you enrolled in the STD plan. HR can mail, email or fax the STD claim papers directly to your doctor's office. Send HR your doctor's office fax number and the name of the doctor.

PTO during leave: you may choose to use your PTO balance during FMLA so you keep getting paid. PTO and floating holidays cannot be added to a period that has already been approved as unpaid leave unless HR approves it first.

Returning to work: a doctor's release is required before returning from a medical leave. If the release lists restrictions (for example limited duty or no lifting), send it to HR before the employee's next shift. HR and the manager will decide together whether a temporary modified-duty role, such as a seated position, fits the restrictions. Do not send someone home or change their job because of a doctor's note until HR has reviewed it.

Job status after leave: managers must not tell an employee on leave that their position will not be available. All decisions about an employee's job while on leave are made by HR.`,
  },
  {
    id: 'f_elig', name: 'Benefits-Eligibility-and-Life-Events.md', folder: 'Benefits', size: 2100, type: 'text/markdown', active: true, test: false, extracted: true,
    description: 'Who can enroll, dependents, life events and what open enrollment requires.',
    content: `# Benefits Eligibility and Life Events

Full-time employees who work 30 or more hours per week are eligible for health, dental and vision insurance. Part-time employees are not eligible when hired. If a part-time employee has averaged 30 or more hours per week over the past 12 months, HR will review their hours and may offer benefits. Managers should email HR to request this review rather than changing anything in Paycor.

New hires, including employees who join when we take over a new property or portfolio, enroll within 30 days of becoming eligible. They do not need to wait for open enrollment.

Open enrollment: if you are keeping the same health, dental and vision plans, you do not need to do anything. Your current elections continue. The only exception is a flexible spending account (FSA), which must be re-elected each year. A "benefits alert" email during open enrollment is a reminder to review your choices, not a sign that something is wrong.

Dependents: children can stay on your plan until the end of the month in which they turn 26. HR will send a reminder and the form to remove them about 60 days before. To add a dependent you must provide proof: a marriage certificate for a spouse, or a birth certificate, adoption papers or legal guardianship papers for a child.

Qualifying life events, such as marriage, birth, adoption or losing other coverage (for example turning 26 and aging out of a parent's plan), let you enroll outside open enrollment. You have 30 days from the event to enroll in Paycor under Benefits and then Life Events. Upload a letter from your previous insurer showing the date coverage ends. Coverage starts on the first of the month after the event when you enroll before that date.`,
  },
  {
    id: 'f_attend', name: 'Attendance-and-Conduct-Policy.md', folder: 'Policies', size: 1900, type: 'text/markdown', active: true, test: false, extracted: true,
    description: 'Call-offs, no call/no show, doctor notes, drug testing and driving on property.',
    content: `# Attendance and Conduct Policy

Calling off: employees who cannot work a shift must call their manager directly at least two hours before the shift starts. A text to a coworker is not a proper call-off.

No call/no show: missing a shift without calling counts as a no call/no show. Three no call/no shows in a row is treated as a voluntary resignation.

Doctor's notes are required to return to work after three or more days in a row of sick call-offs. Send doctor's notes to HR, not only to the manager, because they contain medical information.

Before writing up an employee for absences, managers must check with HR if the employee has mentioned pregnancy, a medical condition, surgery or a family member's illness. Those absences may be protected under FMLA or as an accommodation and must not be counted against them.

Corrective actions and performance improvement plans (PIPs) should be sent to HR before they are delivered, along with any supporting documents. Termination requests must be approved by HR before the employee is told. Send HR the performance documentation: dates, examples, prior corrective actions and any coaching already given.

Drug and alcohol testing: reasonable-suspicion testing requires HR approval. Positions that drive company vehicles or carts are subject to testing. An arrest outside work does not automatically lead to a test or discipline. Contact HR for guidance.

Driving on property: employees must have a valid driver's license to drive company vehicles or golf carts. If a license is suspended, the employee may not drive until it is reinstated.`,
  },
  {
    id: 'f_paycor', name: 'Paycor-How-To.md', folder: 'Systems', size: 1500, type: 'text/markdown', active: true, test: false, extracted: true,
    description: 'Logins, timecard fixes, manager access and staff messages in Paycor.',
    content: `# Paycor How-To Guide

Missed or wrong punches: managers can fix a punch in Paycor under Time and then Timecards by editing the punch and choosing In or Out. If you do not have access, email HR the employee's name, the date, the time and the correct punch type.

Login email: your Paycor account must use your personal email address, not a shared property email. If your login was changed to a property email, or you see a message that accounts cannot be merged, email HR and we will reset it to your personal email.

Timecard access for covering managers: to approve timecards at another property while it has no property manager, email HR with the property name and start date. Your regional manager must approve the request. Access is removed when a new manager starts.

Staff communication: managers can send messages to their team in Paycor under Team and then Announcements. HR can send a step-by-step guide with screenshots on request.

Status changes and documents: managers do not change pay, job titles or employment status in Paycor themselves. Send the request to HR (see the Manager Requests Guide).`,
  },
  {
    id: 'f_mgr', name: 'Manager-Requests-Guide.md', folder: 'Manager Guides', size: 2000, type: 'text/markdown', active: true, test: false, extracted: true,
    description: 'How managers ask HR for letters, pay changes, job descriptions and more.',
    content: `# Manager Requests Guide

Offer letters, promotions and pay changes: email HR the employee's name, new job title, new pay rate and effective date. Pay increases above 5 percent need regional manager approval. HR prepares the letter and sends it to the employee for e-signature, with a copy to the manager.

Status changes, such as Casual to Full Time or Full Time to Part Time: attach the status change memo. HR updates Paycor and confirms when it takes effect. A move to full time may make the employee eligible for benefits.

Step-downs and demotions: when an employee asks to move to a lower role, attach their written request. HR prepares a change-of-position letter. If the pay rate is not changing, say so in the request.

Job descriptions: HR keeps a library of job descriptions. To create a new one, such as a lead role, tell HR the closest existing description and what is different. HR drafts it within five business days.

Background checks and drug tests usually take three to five business days. HR will tell the hiring manager when results are ready. Results are not shared by email.

A wage assignment or garnishment is a legal order to take money from an employee's pay. Forward the documents to HR as soon as they arrive and do not discuss them with other staff. Payroll processes them.

Final pay: deductions from a final paycheck for money owed must be approved by HR because state wage laws limit them. Email HR before sending any balance to collections.

Petty cash: send the signed petty cash form to HR and accounting. HR files it and accounting updates the fund.`,
  },
  {
    id: 'f_support', name: 'Employee-Support-Resources.md', folder: 'Policies', size: 1100, type: 'text/markdown', active: true, test: false, extracted: true,
    description: 'Employee Assistance Program and help for hardship.',
    content: `# Employee Support Resources

The Employee Assistance Program (EAP) is free and confidential for all employees and their household members. It offers counseling, legal and financial advice and help finding childcare, elder care and housing. Call 1-800-555-0142 any time, day or night.

Employees facing a sudden hardship, such as losing their housing, can apply to the Employee Relief Fund for a one-time grant of up to 1,000 dollars. HR helps with the application and keeps it private.

Dialing 211 connects anyone to local emergency housing, food and utility help.

If an employee needs a schedule change because of childcare or a family member's illness, the manager and HR will look at options together, such as a different break time or shift.`,
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
  { id: 's_parttime', label: 'Part-time benefits eligibility', name: 'Dana Whitfield', from: 'dana.w@example.com', subject: 'Benefits for a part-time employee', body: 'Hi HR,\n\nOne of my part-time maintenance techs has been picking up extra shifts for most of the year and wants to sign up for health, dental and vision. When we checked the benefits section of Paycor, nothing was available for him. Is he eligible as a part-timer, and can you update this in Paycor?\n\nThanks,\nDana' },
  { id: 's_oe_nochange', label: 'Open enrollment, no changes', name: 'Gloria Mendez', from: 'gloria.m@example.com', subject: 'Do I need to do anything this year?', body: "Hello,\n\nI read that if I'm not making any changes to my benefits I don't have to do anything. But I also got a \"benefits alert\" email saying something needs my attention. If I'm keeping everything the same, do I need to log in and acknowledge it, or nothing at all?\n\nThanks,\nGloria" },
  { id: 's_age26', label: 'Turning 26, needs coverage', name: 'Ryan Okafor', from: 'ryan.o@example.com', subject: 'Enrolling after aging out of my parent\'s plan', body: "Hello,\n\nI turn 26 next month and will lose coverage under my father's health plan at the end of that month. I'd like to enroll in our company health plan so I don't have a gap. What steps do I complete, what documents do you need, and what's the deadline to be covered on the 1st?\n\nThank you,\nRyan" },
  { id: 's_dependents', label: 'Documents to add dependents', name: 'Tasha Greene', from: 'tasha.g@example.com', subject: 'Verifying dependents', body: 'Hi, what documents are needed to verify dependents? I want to add my husband and son to my plan.\n\nTasha' },
  { id: 's_fmla_spouse', label: 'FMLA to care for a spouse', name: 'Dennis Hall', from: 'dennis.h@example.com', subject: 'Time off to care for my wife', body: "Hi HR,\n\nMy wife is starting cancer treatments in a few weeks and I'll need time off to help her through it. I can get a doctor's letter. I have about 105 hours of PTO and think I'll need around 80. Can I use FMLA, and how do I get the paperwork?\n\nDennis" },
  { id: 's_fmla_year', label: 'FMLA right at one year', name: 'Kayla Brooks', from: 'kayla.b@example.com', subject: 'FMLA for knee surgery', body: "Hi,\n\nI'm a server at Maple Ridge. I have knee surgery scheduled and will be out 6 to 8 weeks. My one-year anniversary is the same day as the surgery. Can I still use FMLA, or is there something else I can do to keep my job?\n\nKayla" },
  { id: 's_std', label: 'Short-term disability papers', name: 'Monica Reyes', from: 'monica.r@example.com', subject: 'Short term disability papers', body: "Hello, I'm a concierge at Harbor Point. I've been in the hospital with balance problems and I'm going through testing, so I'll be out of work. Could the short-term disability papers be faxed to my doctor's office? I have doctor's notes too.\n\nMonica" },
  { id: 's_restrictions', label: 'Doctor note with restrictions', name: 'Paul Jensen', from: 'paul.j@example.com', subject: 'Doctor note - limited duty?', body: "Hi HR,\n\nI received a doctor's note for one of my team members with work restrictions until next month. Does this mean he's on limited duty or can't work at all? I'll need to send him home if it's the latter. She also asked whether she could cover the concierge desk since it's a seated job.\n\nPlease advise,\nPaul" },
  { id: 's_calloffs', label: 'Call-offs, employee is pregnant', name: 'Lauren Price', from: 'lauren.p@example.com', subject: 'Attendance issues - next steps?', body: "Hi,\n\nWe have an associate hired in August who has had several sick call-offs and one improper call-off this month, and she's out of PTO. She recently told us she is pregnant. I was planning to give her a write-up for the policy violations. Do we need a doctor's note for her to return? What do you recommend?\n\nLauren" },
  { id: 's_eviction', label: 'Employee lost housing', name: 'Angela Torres', from: 'angela.t@example.com', subject: 'Resources for an employee', body: 'Hi HR,\n\nI found out this morning that one of my employees was evicted from her housing. She has two young children. Do we have any resources to help her?\n\nThanks,\nAngela' },
  { id: 's_hostile', label: 'Hostile work environment complaint', name: 'Denise Carter', from: 'denise.c@example.com', subject: 'Formal complaint', body: "Dear HR,\n\nSince returning from a medical procedure I've felt targeted by coworkers who say I don't help others. Today a coworker confronted me in the medication room and started recording me. I'm afraid to come to work. I'm requesting a formal investigation, protection from retaliation, and written acknowledgment of this complaint.\n\nDenise" },
  { id: 's_termination', label: 'Manager asks to terminate', name: 'Victor Lin', from: 'victor.l@example.com', subject: 'Approval to terminate maintenance supervisor', body: "Hello HR Team,\n\nI need guidance on ongoing performance problems with my maintenance supervisor: missed city inspection repairs, unresolved work orders, and a three-day water outage he didn't report to me. I'd like approval to move forward with termination on Friday. What documentation do you need?\n\nVictor" },
  { id: 's_arrest', label: 'Employee arrested, drives on property', name: 'Greg Holloway', from: 'greg.h@example.com', subject: 'No call/no show after arrest', body: "Hi,\n\nOne of our techs was a no call/no show this morning and then told us he was arrested last night for DUI. Does this warrant a drug test? I also want to confirm he can't drive the golf cart on property until his license is valid again.\n\nGreg" },
  { id: 's_punch', label: 'Fix a timecard punch', name: 'Sofia Alvarez', from: 'sofia.a@example.com', subject: 'Wrong punch', body: 'Hi, can you please change my 6:25 pm "in" punch to an "out" punch? I forgot to punch out and it recorded it as an in punch.\n\nSofia' },
  { id: 's_login', label: 'Paycor login email changed', name: 'Nate Coleman', from: 'nate.c@example.com', subject: 'Paycor login problem', body: "Not sure if this goes to IT or HR. My Paycor account email was changed to the property manager's shared email. When I click the confirmation link it says the accounts can't be merged. I think it should be my personal email since it's my pay portal.\n\nNate" },
  { id: 's_offer', label: 'New offer letter and raise', name: 'Rachel Kim', from: 'rachel.k@example.com', subject: 'Offer letter for lead server', body: 'Hi HR,\n\nPlease send a new offer letter and job description to one of my servers who is moving up to lead server. Her new rate is $19.50 an hour, starting next Friday.\n\nThank you,\nRachel' },
  { id: 's_jobdesc', label: 'New job description', name: 'Omar Haddad', from: 'omar.h@example.com', subject: 'Housekeeping lead job description', body: "Hi, could we get a job description for a housekeeping lead? I think one was done for lead servers, so maybe we could modify that one?\n\nOmar" },
  { id: 's_garnish', label: 'Wage assignment notice', name: 'Collections Office', from: 'notices@example.com', subject: 'Wage assignment for your employee', body: 'Attached are wage assignment documents for one of your employees: the demand notice, employment confirmation and the signed wage assignment agreement. Please process the wage assignment accordingly.' },
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
  { scenario: 's_fmla_spouse', minutesAgo: 60 },
  { scenario: 's_punch', minutesAgo: 240 },
  { scenario: 's_calloffs', minutesAgo: 600 },
  { scenario: 's_age26', minutesAgo: 2200 },
  { scenario: 's_offer', minutesAgo: 3400 },
  { scenario: 's_eviction', minutesAgo: 5000 },
]
