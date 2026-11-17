// Turns text into the words used to match an employee's question against the documents.
// Documents are reduced to word stems ("adopts" and "adopting" both become "adopt"). A question is also widened with a
// few everyday HR synonyms, because employees rarely use the handbook's own words ("newborn" for "birth", "raise" for
// "pay increase"). Widening only ever finds more candidate passages; the AI still has to back every fact with a quote.

import { tokenize } from './mockAI'

/** A light stemmer: plural and common verb endings. */
export function stem(w) {
  if (w.length > 5 && w.endsWith('ies')) return `${w.slice(0, -3)}y`
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2)
  if (w.length > 4 && /(ss|sh|ch|x|z)es$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

/** Words of a document or heading, stemmed. */
export const docTerms = (text) => tokenize(text).map(stem)

// word the employee might use -> words the handbook is likely to use
const SYNONYMS = {
  newborn: 'birth child dependent', baby: 'birth child dependent', babies: 'birth child dependent', born: 'birth child',
  expecting: 'parental birth', pregnant: 'parental birth pregnancy', pregnancy: 'parental birth', maternity: 'parental birth', paternity: 'parental birth',
  fired: 'termination resign', quit: 'resign resignation notice', quitting: 'resign resignation notice', leaving: 'resign resignation',
  vacation: 'pto', pto: 'vacation', holiday: 'holiday', paycheck: 'pay payroll', paystub: 'pay stub', stub: 'pay',
  missing: 'error wrong underpayment', short: 'error underpayment', incorrect: 'error wrong', wrong: 'error', mistake: 'error wrong', owed: 'underpayment error',
  raise: 'increase merit pay', promotion: 'promote increase', promote: 'promotion',
  documents: 'proof certificate', paperwork: 'proof form', proof: 'certificate document',
  insurance: 'coverage medical health', health: 'medical coverage',
  married: 'marriage spouse', marry: 'marriage spouse', wedding: 'marriage spouse', wife: 'spouse', husband: 'spouse', divorced: 'divorce coverage',
  bank: 'deposit account', deposit: 'bank account',
  sick: 'sick illness', flu: 'sick illness', ill: 'sick illness', cold: 'sick illness',
  funeral: 'bereavement death', died: 'bereavement death', dies: 'bereavement death', passed: 'bereavement death', death: 'bereavement', deceased: 'bereavement death',
  tardy: 'late arrival', late: 'late arrival',
  timecard: 'time punch clock', punch: 'time clock timecard', clock: 'punch timecard',
  reimburse: 'reimbursement expense', reimbursed: 'reimbursement expense', receipt: 'expense reimbursement',
  wfh: 'remote hybrid', telework: 'remote hybrid', home: 'remote hybrid',
  appearance: 'harassment', comments: 'harassment', inappropriate: 'harassment conduct', bullying: 'harassment respectful', uncomfortable: 'harassment respectful concern', discriminated: 'discrimination', harassed: 'harassment',
  retaliated: 'retaliation', retaliate: 'retaliation', retaliating: 'retaliation',
  hurt: 'injury injured report', injured: 'injury report', accident: 'injury report',
  evicted: 'hardship care fund housing', eviction: 'hardship care fund housing', homeless: 'hardship housing', flood: 'hardship care fund', fire: 'hardship emergency',
  braces: 'orthodontia dental', dentist: 'dental', glasses: 'vision frames lenses', contacts: 'vision', therapy: 'counseling assistance', stress: 'counseling assistance', anxious: 'counseling assistance', depressed: 'counseling assistance',
  surgery: 'disability medical leave', operation: 'disability medical leave', hospital: 'medical leave disability', cancer: 'medical leave family',
  course: 'tuition reimbursement', class: 'tuition', certification: 'tuition reimbursement', degree: 'tuition',
  internet: 'stipend', desk: 'stipend equipment', laptop: 'equipment',
  age: 'dependent coverage', aging: 'dependent coverage', aged: 'dependent coverage',
  pension: '401k retirement', retirement: '401k', match: '401k match',
}
const SYN = new Map(Object.entries(SYNONYMS).map(([k, v]) => [stem(k), v.split(' ').map(stem)]))

/** Words of a question: stemmed, plus the handbook words people usually mean. */
export function queryTerms(text) {
  const out = []
  for (const t of docTerms(text)) { out.push(t); const more = SYN.get(t); if (more) out.push(...more) }
  return out
}
