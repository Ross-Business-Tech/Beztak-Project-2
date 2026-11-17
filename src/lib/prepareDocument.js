// How a document is prepared when it is added: kept whole, and, for long ones, split into sections so the AI reads only
// the sections that match each question. There is no size limit here; where the app runs decides how much it can hold.

import { indexSections } from '../engine/sections'

/** Documents shorter than this are small enough to search whole, so they are never split. */
export const SPLIT_ABOVE = 60000

/** Returns { content, sections, sectioned }. `split` is the "Split long documents into sections" choice. */
export function prepareDocument(text, { split = true } = {}) {
  const sections = split && text.length > SPLIT_ABOVE ? indexSections(text) : []
  const sectioned = sections.length > 1
  return { content: text, sections: sectioned ? sections : [], sectioned }
}
