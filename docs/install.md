# Install guide

Everything runs in **one container** (or one Node process). Data is kept in a single SQLite file.

## What you need

- A computer or server that can run Docker (recommended), or Node 22.13+.
- An **Anthropic API key** (console.anthropic.com). The app uses Claude Haiku 5.5 by default. Without a key, the app still runs but uses a simple word-matching writer. Other providers (any OpenAI-compatible service, or a local model such as Ollama) are supported with `AI_PROVIDER=openai`.
- Optional, for Zoho Desk: an admin on your Zoho Desk account (see [zoho-desk.md](zoho-desk.md)). Without it, bring requests in with **Import and evaluate**.
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
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` | Which AI to call. Default: `anthropic`, your Anthropic key, model `claude-haiku-5-5`. For another service set `AI_PROVIDER=openai` and `AI_BASE_URL` |
| `TICKETING_ADAPTER` | `none` (default; use Import and evaluate) or `zohodesk` |
| `ZOHO_*` | Zoho Desk connection (see zoho-desk.md) |
| `POLL_SECONDS` | How often to check for new tickets (minimum 30; default 300) |
| `ALLOW_AUTO_SEND` | Safety switch. Leave `false` unless you have measured accuracy and want some replies sent automatically |
| `EGNYTE_DOMAIN`, `EGNYTE_ACCESS_TOKEN` | Optional: lets admins link an Egnyte folder of policies (see [egnyte.md](egnyte.md)) |
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
5. **Settings > Check the AI connection** to confirm your Claude key works.
6. **Import and evaluate**: upload your sample requests (a file to try is on that page), run the accuracy check, and fix anything it misses in the Workflow. Then add real requests to the Review queue.
7. Optional, later: **Settings > Connection to Zoho Desk**: *Test connection*, then switch on *Pull new tickets*.
8. Start in the safe mode: reviewers approve everything. Watch accuracy for a few weeks before changing anything.

## Troubleshooting

| Problem | What to check |
|---|---|
| Banner: "No AI provider is set" | `AI_API_KEY` is empty. If Settings says the key was rejected, it is wrong or out of credit |
| "Zoho sign-in failed" | Region, client id/secret, or refresh token (see zoho-desk.md) |
| No tickets appear | Pulling is switched off; the ticket is outside `INTAKE_STATUSES` or `ZOHO_DEPARTMENT_ID`; it was created before first start (`BACKFILL_DAYS`) |
| Locked out | Stop the app, delete the `users` row, or start a fresh database, and restart with `ADMIN_PASSWORD` set |
