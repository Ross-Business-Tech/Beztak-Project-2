# Install guide

Everything runs in **one container** (or one Node process). Data is kept in a single SQLite file.

## What you need

- A computer or server that can run Docker (recommended), or Node 22.13+.
- An AI provider account and key (OpenRouter, OpenAI, Azure OpenAI, or any OpenAI-compatible service), or a local model such as Ollama. Without one, the app still runs but uses a simple word-matching writer.
- For Zoho Desk: an admin on your Zoho Desk account (see [zoho-desk.md](zoho-desk.md)).
- HTTPS in front of it (see below) for anything beyond a trial.

## Docker

```bash
git clone <this repository>
cd <folder>
cp .env.example .env
```

Edit `.env` (at minimum: `ADMIN_PASSWORD`, `AI_API_KEY`, and the `ZOHO_*` values), then:

```bash
docker compose up -d --build
```

Open `http://<server>:8080` and sign in as `admin`.

If you did not set `ADMIN_PASSWORD`, read the one-time password from the log:

```bash
docker compose logs app | head -20
```

## Settings reference

All settings are environment variables. See `.env.example` for the full annotated list. The important ones:

| Variable | Meaning |
|---|---|
| `ADMIN_PASSWORD` | Password for the first admin (only used on the very first start) |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | Which AI service to call. Any OpenAI-compatible endpoint works |
| `TICKETING_ADAPTER` | `zohodesk` or `none` |
| `ZOHO_*` | Zoho Desk connection (see zoho-desk.md) |
| `POLL_SECONDS` | How often to check for new tickets (minimum 30; default 300) |
| `ALLOW_AUTO_SEND` | Safety switch. Leave `false` unless you have measured accuracy and want some replies sent automatically |
| `COOKIE_SECURE` | `true` when served over HTTPS |

Changing a variable needs a restart: `docker compose up -d`.

## HTTPS

Put a reverse proxy (Caddy, nginx, Traefik, or your cloud load balancer) in front, terminate HTTPS there, and forward to port 8080. Set `COOKIE_SECURE=true`. Do not expose port 8080 to the internet without HTTPS.

## Backups and upgrades

- **Backup:** the database is the `hrdata` volume (file `hr-helpdesk.db`). Stop the container and copy it, or use `sqlite3 hr-helpdesk.db ".backup backup.db"` for a live copy. It holds tickets, drafts, settings, accounts and the activity log.
- **Upgrade:** `git pull && docker compose up -d --build`. The database is kept.
- **Exit plan:** your data is a standard SQLite file you can open with any SQLite tool.

## Without Docker

```bash
npm ci
npm run build && npm run build:server
set -a; . ./.env; set +a
npm start
```

Run it under a process manager (systemd, pm2) so it restarts.

## First steps after install

1. Sign in, then **Settings > Your password** to change the password.
2. **Settings > Team**: add reviewers.
3. **Knowledge files**: upload your real policies (plain text works best). The AI only quotes from these.
4. **Workflow**: review the risk filters and who gets alerted. The defaults treat harassment, discrimination, retaliation, safety, mental health and legal threats as "always a person".
5. **Settings > Connection to Zoho Desk**: *Test connection*, then switch on *Pull new tickets*.
6. Start in the safe mode: draft notes only, reviewers approve everything. Watch accuracy for a few weeks before changing anything.

## Troubleshooting

| Problem | What to check |
|---|---|
| Banner: "No AI provider is set" | `AI_API_KEY` is empty or wrong |
| "Zoho sign-in failed" | Region, client id/secret, or refresh token (see zoho-desk.md) |
| No tickets appear | Pulling is switched off; the ticket is outside `INTAKE_STATUSES` or `ZOHO_DEPARTMENT_ID`; it was created before first start (`BACKFILL_DAYS`) |
| Locked out | Stop the app, delete the `users` row, or start a fresh database, and restart with `ADMIN_PASSWORD` set |
