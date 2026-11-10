# HR Help Desk AI

An open-source assistant for HR teams. It reads HR requests (imported from a spreadsheet today, or pulled from Zoho Desk once connected), drafts a reply using **your own policy documents** with Claude, and hands the draft to a person to approve. Risky topics (harassment, discrimination, legal threats, safety, mental health) are always routed to a person, never auto-answered.

Built for Beztak. MIT licensed: use it, change it, host it yourself.

## What it does

- **Import and evaluate:** paste or upload a spreadsheet of requests, add them to the review queue, or run an accuracy check that scores the assistant against your own expected answers.
- Optionally pulls new tickets from **Zoho Desk** every few minutes (not required).
- Claude (Haiku 5.5 by default, through Anthropic's API with your own key) reads each message by meaning and drafts a reply grounded in your documents. Every quoted policy passage is checked against the document.
- A visual **workflow editor** decides what is flagged, escalated, tagged, assigned or sent for review. The AI only reads and drafts; the workflow decides.
- Reviewers approve or edit each draft. By default an approved reply is saved as a **private note** on the Zoho ticket and HR sends it from Zoho. Nothing is emailed to an employee unless an administrator turns that on.
- Accounts for admins and reviewers, a full activity log, and a pause switch.

## Two ways to run it

| | Demo | Live server |
|---|---|---|
| Where | Any static web host (`npm run build`, upload `dist/`) | Docker or Node 22+ on your own server |
| Data | Sample data, kept in the visitor's browser | SQLite database on your server |
| Zoho Desk | Not connected | Optional |
| Sign-in | None | Yes |

The same app serves both. It detects whether a server is behind it.

## Quick start (live server, with a pretend Zoho)

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up --build
```

Open http://localhost:8080. The first sign-in password is printed in the log (or set `ADMIN_PASSWORD`). In **Settings**, switch on "Pull new tickets", then "Check for tickets now".

## Real installation

1. Read [docs/install.md](docs/install.md) (Docker or plain Node), or deploy to Render with [docs/deploy-render.md](docs/deploy-render.md) (recommended; `render.yaml` is included).
2. Add your Anthropic API key (`AI_API_KEY`). Optional: connect Zoho Desk, see [docs/zoho-desk.md](docs/zoho-desk.md).
3. Review [docs/security-privacy.md](docs/security-privacy.md) with your IT and legal contacts before using real employee data.

## Without Docker

```bash
npm ci
npm run build && npm run build:server
cp .env.example .env     # then edit it, and load it into your environment
npm start
```

Requires Node 22.13 or newer (it uses the SQLite built into Node, so there is nothing else to install).

## Development

```bash
npm run dev           # the app on its own (demo mode)
npm run test:server   # end-to-end tests with a pretend Zoho Desk and a pretend AI
npm run lint
```

How to add another ticketing system: [docs/extending.md](docs/extending.md).

## Status and limits (v1)

- Without a ticketing connector, requests come in through **Import and evaluate**, and approved replies are recorded in the app (people send them from their own email or help desk).
- Zoho Desk is the only ticketing connector. It was tested against a stand-in Zoho server, **not yet against a real Zoho Desk portal**. Run "Test connection" in Settings and try a few test tickets before relying on it.
- The Claude connection was tested against a stand-in for Anthropic's API. Use **Settings > Check the AI connection** with your real key before relying on it.
- Only the first message of a ticket is read. Later replies from the employee are not reprocessed.
- Attachments are not read.
- Alerts ("Alert HR Director") are recorded in the activity log. They are not emailed yet.
- No single sign-on yet (local accounts only).
- The Docker image has not yet been built and run on a machine with Docker; the same server bundle was run directly with Node.
