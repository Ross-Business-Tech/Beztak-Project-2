# Deployment plan: Render

**Recommendation:** run the Docker image as a single **Render web service with a persistent disk**, owned by Beztak, deployed from a tagged release of their copy (fork) of this repository.

## 1. Why Render (and why not the others)

The app is a long-running server. It keeps its database in a file and, when Zoho Desk is connected, checks it on a timer. That rules some platforms out. (Zoho is optional: without it, requests come in through the app's Import page, and everything else is the same.)

| Platform | Fit | Why |
|---|---|---|
| **Render (Docker + disk)** | **Best** | Runs our image as-is, persistent disk, automatic HTTPS, health checks, one-file setup (`render.yaml`), simple dashboard for a non-programmer, US regions near Michigan |
| Fly.io, Railway | Works | Same idea (container plus volume). More command-line, less friendly for the client's admin |
| Vercel | **Does not fit** | Short-lived serverless functions: no lasting disk, no background timer. It would need a rewrite onto an outside database plus scheduled jobs, which is a different product |
| Render free tier | No | Sleeps when idle (the ticket check would stop) and has no disk |
| Beztak's own cloud (AWS, Azure) | Later option | The same Docker image runs there unchanged, which is why we chose a container |

## 2. What gets deployed

```
Employees -> shared mailbox -> Zoho Desk <----(checks every 5 min, over HTTPS)---- Render web service
                                                                                      |-- app + API (one container)
HR reviewers (browser, HTTPS) ------------------------------------------------------>|-- SQLite on persistent disk (/data)
                                                                                      '-- calls the AI provider
```

- One instance only. SQLite allows one writer, and a disk attaches to one instance. At about 500 tickets a month, one small instance is plenty.
- Zoho Desk is polled, so **no inbound connection from Zoho is needed**. Only HR staff reach the site.
- A deploy restarts the service for a short time (a disk prevents zero-downtime swaps). Tickets that arrive meanwhile are picked up on the next check, because the app remembers where it started.

## 3. Who owns what

| Item | Owner | Reason |
|---|---|---|
| GitHub copy of the code | **Beztak's** GitHub organization (fork of this repository) | They own what they run. Their copy is the only thing Render deploys |
| Render account and service | **Beztak** | Their employee data is on that disk. They control access, billing and deletion |
| AI provider account | **Beztak** | Their data-processing terms and billing |
| Zoho API credentials | **Beztak's Zoho admin** | Credentials stay with the data owner |
| Staging service (testing only) | The team's Render account | **Made-up data only**, never real tickets |

The `.github/` folder here holds workflows for the school's hosting. In Beztak's copy, disable them (Actions > disable) so they do not run.

## 4. Cost (estimates; check current prices)

| Item | Roughly |
|---|---|
| Render web service, Starter plan | about $7 a month |
| 1 GB persistent disk | about $0.25 a month |
| AI usage (about 500 requests a month, two Claude Haiku 5.5 calls each, with policy text) | roughly a dollar or two a month at Haiku 5.5's listed price ($0.10 per million input tokens, $0.50 per million output). A larger Claude model would cost several times more |
| Custom domain and HTTPS certificate | included on Render |

Confirm against Render's pricing page and Anthropic's price list before quoting Beztak. Set a monthly spending limit on the Anthropic account.

## 5. Configuration (Render > Environment)

`render.yaml` pre-fills the non-secret values. You are asked for the secrets once.

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD` | A strong password for the first admin (only used on first start) |
| `AI_API_KEY` | An Anthropic API key (from the account that will pay for it) |
| `AI_PROVIDER`, `AI_MODEL` | Already set to `anthropic` and `claude-haiku-5-5` |
| `TICKETING_ADAPTER` | `none` at launch. Requests come in through **Import and evaluate**. Later, set `zohodesk` and add the `ZOHO_*` values from [zoho-desk.md](zoho-desk.md) |
| `COOKIE_SECURE=true`, `TRUST_PROXY=true` | Already set. Required behind Render's HTTPS proxy |
| `ALLOW_AUTO_SEND=false` | Already set. Leave it off for launch |

## 6. Steps

**A. Staging first (the team's Render account, no real data)**
1. Render dashboard > New > Blueprint > select this repository > apply. When asked for secrets, use a throwaway admin password and the team's Anthropic key (set a low spending limit on it). The Blueprint starts without Zoho.
2. Wait for the first deploy. Open the Render URL. The health check is `/api/health`.
3. Run the verification list in section 7.

**B. Production (Beztak's accounts)**
1. Beztak (or the team, with their admin present) forks the repository into Beztak's GitHub organization and tags the release (`v1.0.0`).
2. Beztak creates a Render account, connects the fork, and applies the Blueprint from the release tag.
3. Enter the production secrets in the dashboard. Do not paste them into chat, email or GitHub.
4. Open the site, sign in as `admin`, change the password, add reviewers (Settings > Team).
5. Upload Beztak's real policies (Knowledge files).
6. Settings > **Check the AI connection**. Then upload real requests in **Import and evaluate**.
7. Optional: add a custom domain (for example `hr-helpdesk.<beztak domain>`) in Render > Settings > Custom Domains, and create the DNS record Render shows.

## 7. Verification checklist (do on staging, repeat on production)

- [ ] `/api/health` returns `ok`, and the login page loads over HTTPS.
- [ ] Sign in works; five wrong passwords then a correct one from another device still works (the limiter counts each visitor separately).
- [ ] Make a change (upload a file), then **restart the service** in Render: the change is still there (the disk is working).
- [ ] Settings > **Check the AI connection** says Connected, and a test email gets a Claude-written draft (not the simple writer). The banner "No AI provider" is gone.
- [ ] **Import and evaluate**: run the sample file. The scorecard says all requests were read by the AI, and every risky sample is caught.
- [ ] Import a few requests to the Review queue. A risky one needs confirmation to approve, and approving sends **no email** anywhere.
- [ ] Only once Zoho is connected: **Test connection** passes, a test ticket appears within 5 minutes with a private note, and approving a reply writes a private note and sends no email.
- [ ] A reviewer account cannot see Settings changes (read-only) and cannot delete tickets.
- [ ] Turn "Pull new tickets" off and on again; nothing duplicates.
- [ ] Download or snapshot a backup and confirm the file opens (section 8).

## 8. Operations

| Topic | Plan |
|---|---|
| **Monitoring** | Render health check restarts a stuck service. Turn on Render's email alerts for failed deploys and downtime. The app shows a red banner when a Zoho check fails. Review the activity log weekly |
| **Backups** | Render can take disk snapshots (confirm schedule and retention on the plan). Also copy the database off the disk monthly: Render Shell > `sqlite3 /data/hr-helpdesk.db ".backup /tmp/b.db"` and download it. A scheduled export is on the roadmap |
| **Upgrades** | Test the new tag on staging, then deploy it manually to production (Render > Manual Deploy). Data is kept on the disk |
| **Rollback** | Render > Deploys > redeploy the previous version. The database stays. If a version changed the database, restore the snapshot first |
| **Emergency stop** | Settings > turn off "Pull new tickets" (instant). To stop everything, suspend the service in Render |
| **Secret rotation** | Change the value in Render > Environment, which restarts the service. Rotate the Zoho refresh token and AI key if anyone who knew them leaves |
| **Who can log in to Render** | Beztak decides. Use 2-factor sign-in on Render, GitHub and Zoho |
| **Access to the site** | The login page is on the public internet. Ask Beztak IT whether to add a gate (for example Cloudflare Access or a VPN). Not included in v1 |

## 9. Schedule (to Tuesday, Nov 17)

| Day | Deployment work |
|---|---|
| Wed Nov 11 | Merge this work into `development`. Create the staging service from the Blueprint and fix anything that fails on first boot (the container has not yet been run on a machine with Docker) |
| Thu Nov 12 | Staging verification (section 7) with the real Claude key. Run the accuracy check on Beztak's sample requests. Beztak creates their GitHub org copy and Render account |
| Fri Nov 13 | Fix what the accuracy check found (risk filters, policies). Zoho is **not** part of delivery unless Beztak provides a sandbox |
| Sat to Sun | Fix list, accuracy check with Beztak's sample requests, documentation fixes |
| Mon Nov 16 | Production deploy in Beztak's Render account from tag `v1.0.0`, verification checklist, training session for reviewers and the admin |
| Tue Nov 17 | Delivery. Walk Beztak through the runbook and the accuracy scorecard |

## 10. Risks

| Risk | Response |
|---|---|
| The container has never been built and run on real Docker | Staging deploy on Wed finds this early. The same server bundle already runs with plain Node |
| The disk is mounted owned by root, so the app could not write | The image's start script fixes ownership, then drops to a normal user. Verify on staging with the restart test |
| No Zoho access | Delivery does not depend on it. Requests come in through Import and evaluate; the Zoho connector ships marked "not verified against a live portal" with the steps to test it later |
| Claude connection not yet tested with a real key | Check on staging with the team's key on Thursday before anything goes to Beztak |
| Render plan or price differs from this plan | Check pricing before agreeing to anything with Beztak |
| Beztak's data on a third-party host raises a policy concern | The image runs on any Docker host. Beztak can move it to their own cloud with the same configuration and the database file |
| Single instance means short downtime on deploys and no redundancy | Acceptable at this volume. Deploy outside business hours. Backups cover disk loss |
| Public login page | Strong passwords, rate limiting and HTTPS now; optional access gate later |

## 11. Open questions for the team and Beztak

1. Will Beztak create and own the Render account (recommended), or should the team host for them? If the team hosts, there must be a written handover and the data should not sit in a student's account.
2. Does Beztak have a preferred domain name and who manages their DNS?
3. Does Beztak IT require the site to be reachable only from the office or VPN?
4. Which AI provider account will they use, and what monthly spending cap?
5. Who receives Render's alert emails?
