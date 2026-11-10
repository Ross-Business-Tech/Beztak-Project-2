# Delivery plan: from demo to client-ready HR helpdesk assistant

**Status:** draft for team review. Items marked **[ASSUMPTION]** need confirming with the client or instructor (see "Open questions").

## 1. Where we are today

A working demo that runs entirely in the browser:

- Visual workflow editor (blocks, presets, team-shared designs).
- AI that reads a message by meaning, then drafts a reply grounded in uploaded HR documents. A person must approve risky replies.
- Review queue, activity log, dashboard, test lab, in-app guide.
- Zoro is treated as the ticketing system, but it is **not connected**. No real email is read or sent.
- Data lives in each user's own browser. AI calls go through a here.now proxy route.

The demo is the right shape. What's missing is everything around it that makes it safe and useful inside a client's HR operation.

## 2. What "plug-and-play" means (definition of done)

The client can, without our help day to day:

1. Connect the tool to the place HR requests already arrive (email and/or ticketing).
2. Load their own policies and handbook.
3. Choose which requests the AI may answer and which always go to a person.
4. Have named staff log in and approve replies.
5. See what the AI did, why, and how often it was right.
6. Turn it off at any time and lose nothing.

Plus: their IT/security team can read a clear answer on where data goes and signs off.

## 3. Guiding decisions

| Decision | Recommendation | Why |
|---|---|---|
| Launch mode | **Suggest-only first**: AI drafts, a person approves every reply. Auto-send only for low-risk topics after the pilot proves accuracy. | Builds trust, limits harm from a wrong answer. |
| Integration style | **Sit beside** their existing tools (read tickets, write back drafts/notes), do not replace them. | Fastest adoption, smallest change for the client. |
| Hosting | Keep the static front end. Add a **small back-end service** for the things a static site can't do: receive tickets, store records, sign users in, hold secrets. | The current host cannot run server code or a database. |
| AI | Keep the model behind a server-side key; add a documented data-handling position (no training on client data, retention limits). | Needed for security review. |

## 4. Workstreams and phases

### Phase 0: Discovery with the client (1 to 2 weeks)
Goal: replace assumptions with facts. Nothing is built until this is done.

- Run the questions in section 7 with the client's HR lead and IT contact.
- Collect 200 to 500 **anonymized** past HR requests plus the policies that answered them.
- Agree the pilot scope: which request types, which team, success measures.
- Get a named client sponsor and an IT security contact.

**Exit:** signed-off pilot scope, integration target chosen, data-sharing terms agreed.

### Phase 1: Prove accuracy offline (2 weeks)
Goal: show the AI is good enough before connecting anything live.

- Build an **evaluation page** that runs the anonymized past requests through the workflow and compares against what HR actually answered.
- Report: share correctly answered, share escalated, share wrong or risky, and examples of each.
- Tune prompts, escalation rules and document grounding until agreed targets are met (propose: no unsafe answer on high-risk topics; escalation recall on risky topics near 100%).
- Add a "reasons" view so a reviewer sees which policy passage supported each draft.

**Exit:** accuracy report the client accepts. This is the strongest sales and trust artifact we will produce.

### Phase 2: Real inputs and outputs (3 to 5 weeks)
Goal: connect to the client's systems in suggest-only mode.

- **Back-end service** (small, hosted by Ross IT or the client) providing: ticket/email intake, storage, authentication, secret handling, scheduled jobs.
- **Intake connector** for the chosen system ([ASSUMPTION] Zoro tickets, with a second option for a shared HR mailbox in Microsoft 365 or Google). Pull new requests, normalize them into the app's message format.
- **Output connector:** write the approved reply (or an internal draft note) back to the ticket. In suggest-only mode, never send to the employee directly.
- **Retry, duplicate and failure handling:** a failed connection must hold items for a person, never drop them.
- **Connection health** on the Settings page: connected, last sync, errors in plain words.

**Exit:** a real (test) ticket flows in, gets a draft, is approved by a person, and the reply lands back in the ticketing system.

### Phase 3: Accounts, roles and shared records (2 to 3 weeks)
Goal: replace browser-only storage with a proper shared system.

- Sign-in using the client's single sign-on if possible ([ASSUMPTION] Microsoft Entra or Google).
- Roles: **Reviewer** (approve/edit), **Admin** (workflows, documents, connections), **Leadership** (read-only measures).
- Server-side database for messages, drafts, decisions, edits, approvals, workflow versions.
- **Audit trail:** who approved what, when, which model and workflow version, which documents were used. Not editable.
- Workflow changes versioned, with who changed what and the ability to roll back.

**Exit:** two different staff members can work the same queue and every action is traceable.

### Phase 4: Client self-service setup (2 weeks)
Goal: the "plug-and-play" experience.

- **Client Setup wizard:** 1) Connect your system, 2) Upload policies, 3) Choose topics the AI may handle and topics that always go to a person, 4) Choose approvers, 5) Review the privacy summary, 6) Run a test message, 7) Go live in suggest-only mode.
- **Document manager:** upload, replace, retire and date policy documents; show which documents each answer relied on; flag documents not updated in a set period.
- **Safety defaults:** sensitive topics (harassment, discrimination, medical, legal, termination, pay disputes) always escalate; per-sender and volume limits; emergency "pause all AI replies" switch.
- Plain-language admin guide and a one-page quick start.

**Exit:** a client admin completes setup unaided in under an hour.

### Phase 5: Security, privacy and compliance package (runs alongside Phases 2 to 4)
- Data map: what is collected, where it goes (including the AI provider), how long it is kept, who can see it.
- Redaction option so names and ID numbers are masked before text goes to the AI. [ASSUMPTION] Client wants this.
- Retention and deletion controls (including delete-on-request).
- Encryption in transit and at rest, secrets only on the server, access logging.
- Vendor documentation for the AI provider's data terms.
- Basic penetration/abuse testing: prompt-injection attempts inside emails, attachments with hostile text, oversized inputs.
- Client IT security questionnaire answered from this package.
- Legal review of employee-data handling for the client's regions (privacy law, works-council or consultation rules where applicable).

**Exit:** client IT/security and legal sign-off in writing.

### Phase 6: Pilot, then rollout (4 to 8 weeks)
- **Pilot:** one HR team, suggest-only, limited topics, weekly review of accuracy, edits and escalations.
- Track: time to first response, reviewer edit rate, escalation rate, employee satisfaction (if available), incidents.
- **Go/no-go checkpoint** against criteria agreed in Phase 0.
- **Rollout:** widen topics and teams in steps. Consider limited auto-send for low-risk topics only if edit rate is consistently low.
- Handover: training session for reviewers, admin training, runbook.

### Phase 7: Operate and support (ongoing)
- Named owner on each side, support hours, response targets.
- Monthly accuracy and incident review; model and prompt change control (test against the evaluation set before any change goes live).
- Cost monitoring for AI usage.
- Backup, recovery and an exit plan (export all data in standard formats).

## 5. Risks and how we handle them

| Risk | Mitigation |
|---|---|
| AI gives a wrong or harmful answer | Suggest-only launch, mandatory escalation topics, verified quotes from documents, evaluation set before changes |
| Employee data exposed | Redaction, access roles, retention limits, no personal data in this public repo |
| Prompt injection via an email | Treat message text as untrusted, never let it change workflow rules, test deliberately |
| Integration breaks silently | Health checks, alerts, hold-for-person fallback |
| Client policies are outdated or contradictory | Document manager with review dates; AI told to escalate when sources conflict |
| Scope creep into a replacement HR system | Keep the "sits beside your tools" position in writing |
| Team capacity (student team, fixed term) | Phase 0 and 1 deliver value alone; later phases can be scoped as a recommended build plan or handed to Ross IT |

## 6. What can start now, inside this repo

These need no client decisions and fit the current static hosting:

1. **Evaluation page** (Phase 1): run a made-up set of past requests, show accuracy and escalation results.
2. **Client Setup wizard shell** (Phase 4): the guided steps, with connections shown as "coming soon".
3. **Privacy and data summary page** (Phase 5): plain-language, matching what the app really does today.
4. **Document manager improvements:** review dates, "which policy backed this answer".
5. **Pause switch and safety defaults** in the workflow.
6. **Client-facing one-pager and demo script.**

Everything else (real connectors, accounts, database) depends on the back-end decision and must not use real data in this public repo.

## 7. Open questions

**Client and scope**
1. Who is the client and who is the sponsor? How many HR staff and employees?
2. Which request types are in scope for the pilot, and which must never be automated?
3. What does success look like (faster replies, fewer tickets, cost saved)?

**Systems**
4. Where do HR requests arrive today: Zoro, a shared mailbox, another tool? Which email platform?
5. Does Zoro offer an API or webhook we are allowed to use? Who grants access?
6. Does the client want read-only sync, or reply write-back too?
7. Do they use single sign-on? Which provider?

**Data and compliance**
8. Which countries or regions are employees in? Any data residency rule?
9. Will the client allow employee text to be sent to an outside AI provider? Is redaction required?
10. Retention period for requests and drafts?

**Delivery**
11. Is the deliverable a working product, a pilot, or a recommendation with a build plan? What date?
12. Who hosts and supports it after handover: the client, Ross IT, or the team?
13. Is there a budget for the back-end service and AI usage?
14. Does Ross IT have an existing handoff or delivery process we should follow?

## 8. Timeline at a glance (indicative, one small team)

| Weeks | Work |
|---|---|
| 1 to 2 | Phase 0 discovery; start items in section 6 |
| 3 to 4 | Phase 1 evaluation and accuracy report |
| 5 to 9 | Phase 2 connectors and back-end; Phase 5 starts |
| 8 to 11 | Phase 3 accounts, roles, audit trail |
| 10 to 12 | Phase 4 setup wizard and document manager |
| 12 to 20 | Phase 6 pilot and go/no-go; rollout after |

Sign-off gates: after Phase 0 (scope), Phase 1 (accuracy), Phase 5 (security), and Phase 6 (go/no-go).
