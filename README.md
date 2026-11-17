# HR Help Desk AI

An open-source assistant for HR teams. It reads HR requests, drafts a reply from **your own policy documents** using Claude, and hands the draft to a person to approve. Sensitive topics (harassment, discrimination, legal threats, safety, mental health) always go to a person and are never auto-answered.

Built for Beztak. MIT licensed.

**Using the app?** Read the [User Guide](docs/user-guide.md).

## Features

- **Import and evaluate:** load requests from a spreadsheet, queue them for review, or score the assistant's accuracy against expected answers.
- **Knowledge files:** upload policies, or link one read-only Egnyte folder. Quoted passages are checked against the source document.
- **Workflow editor:** a visual editor that decides what is flagged, escalated, tagged, assigned or sent for review. The AI reads and drafts; the workflow decides.
- **Review queue:** a person edits and approves every reply. By default an approved reply is saved as a private note on the ticket, and nothing is emailed to an employee unless an admin turns that on.
- **Access control:** admin and reviewer roles, an Access page, an activity log and a pause switch.
- **Zoho Desk (optional):** pulls new tickets every few minutes.

## Run it

| | Demo | Live server |
|---|---|---|
| Hosting | Any static host (`npm run build`, upload `dist/`) | Docker, or Node 22.13+ |
| Data | Sample data in the visitor's browser | SQLite on your server |
| Sign-in | None | Yes |
| Zoho Desk | No | Optional |

Try the live server with a pretend Zoho:

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up --build
```

Open http://localhost:8080. The first admin password is printed in the log (or set `ADMIN_PASSWORD`).

Without Docker:

```bash
npm ci
npm run build && npm run build:server
cp .env.example .env   # edit it, then load it into your environment
npm start
```

For production, deploy to Render ([guide](docs/deploy-render.md), `render.yaml` included) and set your Anthropic key as `AI_API_KEY`.

## Development

```bash
npm run dev           # demo mode
npm run test:server   # end-to-end tests with a pretend Zoho Desk and AI
npm run lint
```

## Documentation

[User guide](docs/user-guide.md) · [Install](docs/install.md) · [Deploy to Render](docs/deploy-render.md) · [Zoho Desk](docs/zoho-desk.md) · [Egnyte](docs/egnyte.md) · [Security and privacy](docs/security-privacy.md) · [Extending](docs/extending.md)

Review the security and privacy guide with IT and legal before using real employee data.

## Known limits (v1)

- Zoho Desk, Egnyte and the Claude connection were tested against stand-ins, not live accounts. Use **Test connection** and **Check the AI connection** in Settings before relying on them.
- Only the first message of a ticket is read. Attachments and scanned PDFs are not.
- Alerts are recorded in the activity log, not emailed.
- Local accounts only; no single sign-on.
- The Docker image has not yet been built on a machine with Docker.
