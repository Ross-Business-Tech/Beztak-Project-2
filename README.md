# HR Help Desk AI

An assistant for HR teams, built for Beztak. It reads incoming HR requests, drafts a reply from **your own policy documents**, and hands the draft to a person to approve. MIT licensed.

**Using the app?** Read the [User Guide](docs/user-guide.md).

## What the website does

- **Takes in requests:** from a spreadsheet, or automatically from Zoho Desk (optional).
- **Drafts replies:** the AI answers only from the policy files you upload or link (one read-only Egnyte folder), and quoted passages are checked against the source.
- **Routes each request:** a visual workflow decides what is flagged, escalated, tagged, assigned or sent for review.
- **Keeps a person in charge:** every reply is edited and approved by a reviewer. An approved reply is saved as a private note on the ticket; nothing is emailed to an employee unless an admin turns that on.
- **Controls access:** admin and reviewer roles, an activity log and a pause switch.

## How the AI works

1. A request arrives and the AI labels its topic and risk level.
2. If it is sensitive (harassment, discrimination, legal threats, safety, mental health), it goes straight to a person and the AI does not answer it.
3. Otherwise the AI finds the relevant policy passages and drafts a warm, plain-language reply that cites them.
4. The workflow routes the draft to the review queue.
5. A reviewer edits and approves it. The AI never sends anything on its own.

The AI reads and drafts; the workflow and the people decide.

## Deploying

Deploy to Render ([guide](docs/deploy-render.md), `render.yaml` included) and set your Anthropic key as `AI_API_KEY`. A demo version with sample data also runs on any static host.

## Documentation

[User guide](docs/user-guide.md) · [Install](docs/install.md) · [Deploy to Render](docs/deploy-render.md) · [Zoho Desk](docs/zoho-desk.md) · [Egnyte](docs/egnyte.md) · [Security and privacy](docs/security-privacy.md) · [Extending](docs/extending.md)

Review the security and privacy guide with IT and legal before using real employee data.

## Known limits (v1)

- Zoho Desk, Egnyte and the Claude connection were tested against stand-ins, not live accounts. Use **Test connection** and **Check the AI connection** in Settings before relying on them.
- Only the first message of a ticket is read. Attachments and scanned PDFs are not.
- Alerts are recorded in the activity log, not emailed.
- Local accounts only; no single sign-on.
