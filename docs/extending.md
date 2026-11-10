# Adding another ticketing system

The server talks to ticketing systems through a small adapter. Zoho Desk is `server/adapters/zohodesk.js`.

An adapter is a function that receives the configuration and returns an object with:

| Member | Purpose |
|---|---|
| `name` | Identifier, for example `"zohodesk"` |
| `configured` and `missing` | Whether credentials are present, and which are missing (shown in Settings) |
| `health()` | Returns `{ ok, detail }`; used by "Test connection" |
| `listNewTickets({ since })` | Tickets created at or after `since`, oldest first, each `{ id, number, subject, from, name, body, receivedAt, url }` (body as plain text) |
| `addInternalNote(id, text)` | Private note visible to staff only |
| `sendReply(id, { to, text })` | Email the employee |
| `setStatus(id, status)`, `addTags(id, tags)`, `assign(id, assignee)` | Ticket changes from the workflow |

Steps:

1. Copy `server/adapters/zohodesk.js` to a new file and change the API calls.
2. Register it in `server/adapters/index.js`.
3. Add its settings to `server/config.js` and `.env.example`.
4. Copy `server/mock-zoho.js` into a stand-in for the new system and add a test like `server/test/e2e.test.js`.
5. Run `npm run test:server`.

Other ideas that fit the same shape: a shared mailbox over IMAP, Freshdesk, Jira Service Management, or a CSV import.

The AI side is already provider-neutral: any OpenAI-compatible endpoint works through `AI_BASE_URL`.
