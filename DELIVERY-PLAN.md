# Delivery plan: Beztak HR helpdesk assistant (open-source, due Tuesday, Nov 17, 2026)

**Client:** Beztak, a real estate firm in Michigan.
**Deliverable:** a fully open-source, working product the client can run themselves.
**Time available:** 7 days from Tuesday, Nov 10. Items marked **[ASSUMPTION]** need confirming (see section 8).

This replaces the earlier 20-week plan. With one week, the goal is a **working, honest, self-hostable first release in suggest-only mode**, plus a clear roadmap for everything else. Anything that cannot be finished and tested by Monday is listed as "not in this release" rather than shipped half-built.

## 0. Progress (updated Tue Nov 10, 2026)

Decisions made: Zoho Desk is the ticketing system (confirmed by the team, not yet by Beztak's admin); launch is suggest-only; reply handling defaults to a private note on the ticket; MIT license (to confirm with Beztak); build for flexibility (any OpenAI-compatible AI, adapter design for ticketing); about 500 tickets a month.

**Built and tested (branch `Brendan`):**
- Self-hosted server (one container, SQLite, no other services): sign-in with admin and reviewer roles, shared settings/workflow/documents, activity log.
- Zoho Desk connector (read tickets, private notes, status, tags, assign, optional email reply) plus a stand-in Zoho server for testing and demos.
- Provider-neutral AI connection with the key kept on the server.
- Safety: nothing is emailed without an admin choice, high-risk topics need confirmation, a failed Zoho write never marks a reply as sent, tickets cannot be deleted, shared presets cannot change Zoho settings.
- Settings screens for Zoho status, test connection, pause switch, team accounts and passwords.
- End-to-end automated tests (`npm run test:server`), Dockerfile and compose files, `.env.example`, install, Zoho, security/privacy and extension guides, MIT license.

**Not yet done:**
- Test against a real Zoho Desk portal (needs a sandbox and admin credentials from Beztak; the single biggest open risk).
- Build and run the Docker image on a machine with Docker (no Docker engine in the build sandbox).
- Accuracy evaluation page using Beztak's 20 to 50 sample requests.
- Policy document manager improvements (review dates, which policy backed an answer), setup wizard, import from CSV.
- Retention and delete-on-request tools; alert emails; reading ticket follow-ups and attachments.
- Independent security review.

## 1. What we know

- HR requests arrive at a shared email, which is routed into **Zoro** (ticketing). Zoro's internals are **not yet confirmed**. The app already has a placeholder for a "Zoro MCP server address", which suggests Zoro exposes an MCP server, but nothing in the repo or our research confirms what Zoro is, what it can do, or how to authenticate. A web search for "Zoro" returned only Zoho Desk results, which may be a different product or a spelling difference.
- The client accepts employee text going to an outside AI provider.
- Hosting and support after handover are undecided, so the product must be **flexible**: easy to run anywhere, with no lock-in to any one vendor.
- Today's app is a browser-only demo: sample data, no real inbox or ticket connection, data stored in each person's browser, one AI route through here.now.

## 2. Release definition (what "done" means on Tuesday)

A Beztak IT person can, from the repo alone:

1. Run the whole product with **one command** (Docker) on any computer or server, or on a cloud host.
2. Open it, sign in, and see real tickets pulled in from Zoro (or from the fallback path below).
3. See an AI-written draft reply grounded in Beztak's own uploaded policies, with the policy quotes shown.
4. Have a person approve or edit the draft, and see the approved reply written back to the ticket as an internal draft note (default) or a public reply (opt-in).
5. See risky topics (harassment, discrimination, medical, legal, pay disputes, termination) always routed to a person, never auto-answered.
6. Change the AI provider, the ticketing connection, and the policies from settings or a config file, without editing code.
7. Read plain-language docs: install, configure, connect, operate, and a privacy and data summary.
8. Fork, modify and redistribute it under an open-source license.

**Launch mode is suggest-only.** No reply goes to an employee without a person approving it. Auto-send stays in the app but is off by default and documented as "enable only after you have measured accuracy".

## 3. Architecture for flexibility

The front end stays as it is. We add a **small self-hosted server** (the only way to hold secrets, store shared data and call Zoro safely) and put every outside system behind a swappable adapter.

```
Employee email --> shared mailbox --> Zoro ticket
                                        |
                       [Ticketing adapter] (Zoro, plus fallbacks)
                                        |
Browser app <--> Server (API, queue, audit log, SQLite database)
                                        |
                       [AI adapter] (any OpenAI-compatible endpoint)
```

| Piece | Decision | Why |
|---|---|---|
| Server | Node.js, one container, serves the app and an API | Same language as the app, easy to host anywhere |
| Storage | SQLite file (swappable to Postgres later) | No extra service to install; one file to back up |
| Ticketing adapter | Defined interface: list new tickets, read one, add draft note, post reply, set status/tags/assignee. **Zoro adapter first**, driven by whatever Zoro offers (MCP or REST). | Confirmed by Zoro access, not guessed |
| Fallback inputs | (a) **IMAP mailbox reader**, (b) **CSV/paste import**, (c) a **mock Zoro server** for testing | Works even if Zoro access is blocked; also what the evaluation uses |
| AI adapter | Any OpenAI-compatible URL + key (OpenRouter, OpenAI, Azure, local Ollama, vLLM); direct Anthropic option | No vendor lock-in; a firm can keep it fully local |
| Secrets | Environment variables only; never in the repo or the browser | Required for open-source safety |
| Sign-in | Admin and reviewer accounts stored in the server, passwords hashed; single sign-on documented as the next step | Smallest secure option for a week |
| Audit log | Every ticket, draft, edit, approval, model and workflow version, append-only | Needed for trust and for IT review |
| Demo | The current here.now static demo stays as the live showcase | Nothing is lost |

**Rule for this public repo:** it holds code and made-up sample data only. Real employee data lives on the client's own server.

## 4. Day-by-day plan

| Day | Work | Output |
|---|---|---|
| **Wed Nov 11** | Get Zoro facts (see questions). Choose license. Set up server skeleton, config, Docker, database. Define the ticketing and AI adapter interfaces. | Container runs; app served by the server; decisions recorded |
| **Thu Nov 12** | Build Zoro adapter (or its fallbacks) and the mock Zoro server. Pull tickets into the queue. Move queue, drafts and settings from browser storage to the server. | Tickets appear in the Review queue from the mock and, if access exists, from real Zoro |
| **Fri Nov 13** | Write-back: approved reply or draft note posted to the ticket; status, tag, assign blocks made real. Server-side AI proxy with provider setting. Sign-in and the two roles. | Full loop works end to end on the mock |
| **Sat Nov 14** | Safety: mandatory escalation topics, prompt-injection tests, pause-all switch, rate limits, audit log view. Accuracy evaluation page using made-up past requests. | Safety and evaluation results shown in the app |
| **Sun Nov 15** | Policy document manager (upload, replace, retire, dates, "which policy backed this answer"). Setup wizard. Privacy and data summary page. | A client admin can set up without code |
| **Mon Nov 16** | Docs (install, configure, connect Zoro, operate, troubleshoot, security, contributing), license, README, release notes, demo script, one-page overview. Full test pass on desktop and phone. Fix list. | Release candidate and docs |
| **Tue Nov 17** | Final checks, tag release v1.0.0, pull request into `development`, handoff session. | Delivered |

Check-ins: end of Wed (Zoro answer), end of Fri (go/no-go on the real Zoro connection), end of Mon (release candidate).

## 5. Open-source readiness checklist

- [ ] License chosen and added (`LICENSE`). Proposal: **MIT** (simplest, most permissive) or **Apache-2.0** (adds an explicit patent grant). Beztak or their counsel should confirm. [ASSUMPTION: no preference]
- [ ] All dependencies reviewed for license compatibility; list in `THIRD-PARTY-NOTICES`.
- [ ] No secrets, keys, real names, emails or Beztak internal details anywhere in the repo or history (secret scan run).
- [ ] `README`, `docs/` install and configuration guides, `CONTRIBUTING`, `SECURITY` (how to report a vulnerability), `CODE_OF_CONDUCT`.
- [ ] `.env.example` listing every setting with safe placeholders.
- [ ] One-command start (`docker compose up`) tested on a clean machine.
- [ ] Automated tests for the workflow engine, adapters and safety rules, and a CI check that runs them.
- [ ] Versioned release with release notes and a changelog.
- [ ] A short "how to add a ticketing adapter" guide so other systems can be plugged in.

Note: `scripts/`, `.github/`, `.claude/` and `admin/` are maintained by Ross IT. Anything we need there (for example a CI test job) will be requested, not edited without approval.

## 6. Risks (one-week version)

| Risk | Likelihood | Response |
|---|---|---|
| Zoro is undocumented or access takes days | High | Build to an adapter and a mock; ship IMAP and CSV fallbacks; document exactly what Zoro must provide |
| One week is too short for all of the above | High | Cut line below; the first four days are the must-haves |
| Wrong or unsafe AI answer | Medium | Suggest-only, mandatory escalation, quote verification, evaluation page, injection tests |
| Employee data leaks through the open-source repo | Low if disciplined | Made-up data only, secret scanning, `.env` never committed |
| Handoff owner unclear | High | Self-hostable design, written runbook, no hidden dependencies on here.now |
| Legal and privacy questions for HR data (Michigan and any other states where staff live) | Medium | Privacy summary written plainly; recommend Beztak's counsel review before real use. We are not giving legal advice |

**Cut line if time runs short** (in this order, drop from the bottom):
1. Must ship: server, one-command start, ticket intake (Zoro or fallback), review and approve, write-back, safety rules, audit log, docs, license.
2. Should ship: sign-in with roles, evaluation page, document manager, setup wizard.
3. Later: single sign-on, Postgres, email redaction option, more adapters, scheduled reports.

## 7. After delivery (roadmap, not in v1.0.0)

Pilot with one HR team in suggest-only mode; measure edit and escalation rates; add single sign-on, redaction before AI calls, retention controls and delete-on-request; add more ticketing adapters; consider limited auto-send for low-risk topics only after enough measured accuracy; agree a support owner.

## 8. Open questions (blocking ones first)

1. **What exactly is Zoro?** Is it a commercial product (and which: Zoho Desk?), or a Beztak or vendor internal tool? A link to its documentation, its API or MCP server address, and a **test or sandbox account** would settle this. Without them we build the adapter and mock only.
2. **Who can give us Zoro access** (API key or MCP address, test project) and by when? We need it by end of Thursday for a real connection to be tested.
3. **License:** is MIT acceptable, or does Beztak want Apache-2.0 or another license?
4. **Where will Beztak run it first** (a company server, a cloud account, a laptop for demo)? If unknown, we deliver Docker and docs and leave the rest.
5. **Reply handling:** should approved replies post as internal draft notes for HR staff to send from Zoro (safest, our default), or send to the employee directly?
6. **AI provider:** is OpenRouter acceptable for v1, or does Beztak want to use their own provider account? We keep it configurable either way.
7. **Who tests on Beztak's side before Tuesday**, and can we have 20 to 50 realistic, anonymized sample requests?
