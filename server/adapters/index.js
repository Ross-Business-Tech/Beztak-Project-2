import { createZohoDeskAdapter } from './zohodesk.js'

/** A ticketing adapter needs: name, configured, health(), listNewTickets({since}), addInternalNote, sendReply, setStatus, addTags, assign.
 *  To support another system, add a file beside zohodesk.js and register it here. */
const REGISTRY = { zohodesk: createZohoDeskAdapter }

export function createAdapter(cfg) {
  const make = REGISTRY[cfg.ticketing.adapter]
  return make ? make(cfg) : null
}
export const adapterNames = () => Object.keys(REGISTRY)
