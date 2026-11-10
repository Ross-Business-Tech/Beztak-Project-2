# Security and privacy summary

Plain-language answers for your IT, security and legal contacts. This is documentation of how the software works, not legal advice. Have your counsel review it against the laws and agreements that apply to your employees.

## What data the system holds

| Data | Where | Kept until |
|---|---|---|
| Ticket text (sender name, email, subject, body), AI drafts, reviewer edits, case notes, decisions | SQLite file on your server | You delete it (no automatic expiry in v1) |
| Your policy documents, including copies of files synced from a linked Egnyte folder | same | You delete them (Settings > Egnyte documents > Remove synced copies, or turn the link off) |
| Accounts (username, salted password hash) | same | You remove them |
| Activity log (who did what, when) | same | Not editable from the app |
| Zoho and AI credentials | Environment variables on your server only | n/a |

No data is sent to the app's authors or to any analytics service. The app makes outbound calls only to **your chosen AI provider** (Anthropic's API by default) and, if you connect it, **your Zoho Desk**.

## What leaves your server

For each request, the AI provider receives: the sender's name and email address, the subject and body, the risk-rule descriptions, and the policy documents (truncated). It does **not** receive anything else from your systems. Employees' records are never looked up. Check Anthropic's current commercial terms on data retention and training for API use, and decide whether they meet Beztak's policy.

Options to reduce exposure: confirm the provider's retention terms, use a provider inside your own cloud account, or run a local model (`AI_PROVIDER=openai` with `AI_BASE_URL` pointing at it). For accuracy checks, anonymize the requests first. Masking names and email addresses before the AI call is on the roadmap and is **not** in v1.

## Egnyte

If you link an Egnyte folder, the app reads it with a token for one Egnyte user and **only reads** (list and download). It stores a text copy of each readable file, refreshed every hour, so what the AI can see is exactly what that user can see in the chosen folder. Parts of these documents are sent to the AI provider with each request and can be quoted in drafted replies and shown to reviewers.

- Use a dedicated Egnyte user with view-only access to a folder holding only employee-appropriate policies and guides. Do not link folders with case files, personal data or pay data.
- The token is kept in the server's environment, never in the browser or the database, and Egnyte says tokens can expire (after 30 days in its current documentation). Rotate it when staff who knew it leave.
- Anyone who can edit the linked folder in Egnyte can change what the AI says. Treat edit rights on that folder like edit rights on your policies. The AI is told to treat document text as reference material and not to follow instructions written inside it, but that is a mitigation, not a guarantee.
- Files in unsupported formats, over the size limit, or beyond the file limit are skipped and listed in Settings.

## Access control

- Sign-in required for everything except the login page. Passwords are hashed with scrypt; sessions use random tokens stored hashed, HttpOnly, SameSite=Strict cookies, and expire after 12 hours.
- Two roles: **reviewer** (review, approve, notes) and **admin** (also settings, workflow, documents, accounts).
- Repeated failed sign-ins from one address are rate-limited.
- Changing requests need a custom header, which blocks cross-site request forgery.
- Serve over HTTPS (see the install guide). The app sets `Content-Security-Policy` and other protective headers.

## AI safety design

- The AI reads and drafts. It never decides where a message goes. That is plain rules in the workflow.
- Message text is treated as untrusted. The AI is told to ignore instructions inside messages, and the workflow's routing cannot be changed by message text.
- Every policy quote the AI cites is checked against the document; unverifiable quotes are dropped and confidence is lowered.
- High-risk topics get a cautious draft with no advice and **require a person's confirmation**.
- Nothing is emailed to an employee unless an admin both turns on "Email the employee" and (for fully automatic sending) sets `ALLOW_AUTO_SEND=true`.
- If the AI is unreachable, the app falls back to a simple writer and says so, and a person still approves.
- Pausing: turn off "Pull new tickets" in Settings.

## Audit trail

Every ticket received, draft, edit, approval, setting change, sign-in and account change is recorded with the person and time in the activity log. The log is append-only in the database; there is no delete button.

## Known limits (v1)

- No automatic data retention or delete-on-request tool (delete records via the database).
- No single sign-on or two-factor authentication.
- Reviewer confirmation for high-risk replies is enforced in the interface; the server enforces sign-in and roles but not that checkbox.
- A reviewer with access sees all tickets in the queue, including sensitive ones; there is no per-case restriction.
- The server has not had an independent security review or penetration test. Get one before processing real employee complaints at scale.

## Reporting a vulnerability

Open a private security advisory on the repository, or contact the maintainers directly. Please do not post details publicly first.
