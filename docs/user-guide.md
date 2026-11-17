# HR Help Desk AI: User Guide

For reviewers and administrators. The assistant drafts replies using your approved policy documents. **On this installation, every reply waits for a person to review and approve it.**

## Getting started

Sign in with the credentials your administrator gave you. Use the navigation menu to open the Review queue, help pages, or administration pages available to you.

| Page | Reviewer | Administrator |
| --- | --- | --- |
| Review queue and Getting started | Always available | Yes |
| Import and evaluate, Test emails, Test a document | If enabled by an administrator | Yes |
| Dashboard and Activity log | If enabled by an administrator | Yes |
| Workflow and Knowledge files | View only, if enabled by an administrator | Yes |
| Settings and Access | No | Yes |

### How a request is handled

1. A request arrives through Import and evaluate or a connected Zoho Desk account.
2. The Workflow checks the message, flags risks, and routes it.
3. The assistant prepares a draft using available policy documents and quotes its sources.
4. A person reviews the message and draft before approving a reply.

The current workflow routes harassment, discrimination, retaliation and whistleblowing, workplace violence and safety, mental-health crises, and legal threats to urgent human review. Other sensitive topics also have a separate review path. Administrators can change these rules.

## Step by step: your first request

1. Open the **Review queue**.
2. Choose **Needs review**, **Flagged**, **Handled**, or **All**. Use Search to find a message.
3. Open a case. The most urgent and longest-waiting messages appear first.
4. Read the original email and why it needs a person.
5. Read the draft and check its supporting policy passages. If the available documents do not support an answer, write or obtain an appropriate response yourself.
6. Edit the draft so it accurately addresses the request.
7. Save your draft if you need to return later, or use the send or approval control when it is ready.
8. For a high-risk message, complete the required confirmation before sending.

**If the queue is empty:** someone with access to Import and evaluate can add requests. Choose **Use an example**, paste CSV or JSON, or upload a CSV. Select **Add to Review queue**, then click the **Add to Review queue** button. Use made-up or anonymized requests for practice.

## Reviewing requests

- Read the original message before relying on the draft.
- Check the supporting policy passages and any explanation of the flag.
- Correct missing details, unsupported statements, and unsuitable wording.
- Use **Save draft** to keep unfinished work.
- Use **Case notes** for internal comments, such as who you spoke to and what was agreed. These notes stay internal.
- High-risk cases show a red notice and require confirmation before the send control becomes available.

### What happens after approval?

The destination depends on **Settings → Connections → When a person approves a reply**:

| Setting | Result |
| --- | --- |
| Save as a private note on the ticket | Adds the approved reply as an internal Zoho Desk note. HR sends it from Zoho Desk. |
| Email the employee through Zoho Desk | Sends the approved reply to the employee through Zoho Desk. |
| Only record it here | Records the reply in this application. |

The current setting is **Save as a private note on the ticket**. Zoho Desk must be connected for ticket updates to work.

## What each page does

The menu on the left has three groups. Some pages are available to administrators only, or to reviewers only if an administrator turns them on (see the table at the top of this guide).

### Work

| Page | What it does |
| --- | --- |
| **Review queue** | Where reviewers spend their time. Every request waits here with the original email, the AI's draft and the policy passages behind it. Edit the draft, add internal case notes, then approve it. High-risk cases need an extra confirmation. |
| **Import and evaluate** | Brings in requests from pasted CSV or JSON, or an uploaded CSV, up to 200 at a time (`subject` and `body` are required; `name`, `from` and `received_at` are optional). **Add to Review queue** drafts them for a person. **Check accuracy** scores the assistant against your expected answers without adding anything to the queue. |

### Manage

| Page | What it does |
| --- | --- |
| **Dashboard** | Shows request volumes, how much the AI handled, and what still needs attention. |
| **Workflow** | The map that decides how each request is read, flagged, drafted, escalated and routed. Start from a ready-made design and adjust it. The design check finds paths that could send a flagged or unchecked message without a person. Designs and blocks are explained below. |
| **Knowledge files** | The policy documents the AI is allowed to quote. Upload or paste text, organize files into folders, and turn **AI can use** on or off for each file. |
| **Access** | Add people by email, give them the Reviewer or Admin role, and choose which optional pages reviewers can open. |
| **Settings** | Choose the AI engine and check its connection, set the reply style and signature, and manage the Zoho Desk and Egnyte connections and what happens when a reply is approved. |
| **Activity log** | A record of changes and actions, such as who approved what and which settings changed. |

### Help

| Page | What it does |
| --- | --- |
| **Getting started** | A short tour of how a message moves through the help desk. |
| **Test emails** | Write a made-up employee message, or pick an example, and see the draft, flags and explanation. Nothing is read from or sent to real email or Zoho Desk. |
| **Test a document** | Try a practice document and ask it a question to see how the AI would answer from it. |

### Workflow designs

The **Workflow** page shows how each request is handled as a map of connected steps. You can start from one of four ready-made designs using **Starter designs**. Each design is a different balance between AI speed and human control.

| Design | Best for |
| --- | --- |
| Balanced (the starter design) | Day-to-day use, once you trust the drafts |
| Automatic with safeguards | Mature use, only after thorough accuracy testing |
| A person reviews everything | Getting started |
| Triage only (no AI replies) | Building trust before using drafts |

#### Balanced (the starter design)

**What it does:** Every message is read and checked for risk. The design then sorts it into one of four paths:

1. **Critical risks** (harassment, discrimination, retaliation, safety, mental-health crises, legal threats): the HR Director is alerted, the ticket is tagged and marked Escalated, the AI writes a short, careful reply that gives no advice, and the case goes to **urgent review**. The reviewer must confirm before sending.
2. **Sensitive topics** (accommodation, hardship, termination, pay disputes, immigration): the AI drafts a reply and a person reviews it in the normal queue.
3. **Everything else:** the AI drafts a reply from your policy documents. If it is unsure (confidence below 80%), it tries again, up to two more times.
4. **Safe to send?** A reply is prepared for sending only if confidence is at least 80%, the topic is time off, benefits, policy or onboarding, and a policy passage backs it up. Otherwise it goes to the review queue.

**Who approves:** A person approves every reply, including the safe ones.

**Use it when:** You want the standard setup, with extra care on risky messages.

#### Automatic with safeguards

**What it does:** It is the same as Balanced, except that a reply passing the "Safe to send?" check is sent without a person. Risky and sensitive messages still go to a person.

**Who approves:** Nobody, for safe topics. A person is still involved for everything else.

**Use it when:** You have run **Check accuracy** on your own documents and trust the results. This is not available on this installation, because automatic sending is switched off on the server. A technical administrator would have to enable it.

#### A person reviews everything

**What it does:** Every message is read and checked for risk. Risky messages trigger an alert to the HR Director, get a careful no-advice draft, and go to urgent review with required confirmation. All other messages get a normal AI draft and go to the review queue.

**Who approves:** A person, on every message. Nothing is ever sent automatically.

**Use it when:** You are just starting out. It is the safest design.

#### Triage only (no AI replies)

**What it does:** The AI only reads and sorts. Risky messages are assigned to the HR Director as urgent, with required confirmation. Everything else goes to the review queue with no draft, so reviewers write their own replies.

**Who approves:** A person writes and approves every reply.

**Use it when:** You want to see how well the AI sorts and flags messages before you rely on its drafts.

#### Customizing a design

Any design can be changed after you load it:

- Add, remove or reword risk rules, and change who is notified.
- Change the confidence level or the topics required for a reply to count as safe.
- Change the reply tone for each drafting step.
- Add steps that tag, change the status of, or assign Zoho Desk tickets.

Use the **design check** to find paths that could send a flagged or unchecked message without a person. Then run **Check accuracy** to confirm the new design behaves as you expect before your team relies on it.

### Workflow building blocks

Each step on the Workflow map is a block. Blocks connect with arrows. Some blocks have more than one exit, such as **Flagged** and **Clear**, so a message can take different paths. Click a block to see its settings.

#### Start

| Block | What it does |
| --- | --- |
| **Email received** | Where every request begins. In normal use it is a ticket pulled from Zoho Desk, and in the Test Lab it is the message you write. Every workflow has exactly one, and it cannot be deleted. |

#### AI

| Block | What it does |
| --- | --- |
| **Understand with AI** | The AI reads the whole message and works out the topic. It also looks for hidden risk by meaning, so a message that never uses the word "harassment" can still be caught. Put it before your risk filters, because without it the filters only check for words. |
| **Write reply with AI** | The AI drafts the reply using only your Knowledge files and quotes its sources. For a message a risk filter marked as careful, it writes a short, warm reply that gives no advice. You can choose its tone (from Settings, warm, professional or concise). Place it again after a **While** block to let the AI try again. |

#### Filters

| Block | What it does |
| --- | --- |
| **Risk filter** | Checks whether a message touches a sensitive subject, such as harassment or a legal threat. Each rule has trigger words and a plain description, so the AI can also catch it by meaning. Each rule also has a severity and a person to notify. Messages that match leave by **Flagged** and the rest leave by **Clear**. Turn on **Careful reply** to give flagged messages a cautious, no-advice draft. |
| **Text filter** | A simple check for words in the subject, the message or the sender address. Use it to spot spam, VIP senders or a particular product. It does not mark the message as risky. Messages leave by **Match** or **No match**. |

#### Logic

| Block | What it does |
| --- | --- |
| **If / Else** | Asks a question and sends the message down **Yes** or **No**. You can combine conditions so that all must be true, or any one is enough. For example: if confidence is at least 80% and the topic is time off, go to Yes. |
| **While (repeat)** | Repeats a step while a condition is true, such as writing the reply again while confidence is below 80%. A maximum number of repeats (up to five) prevents endless loops. When the condition stops being true, or the maximum is reached, the message leaves by **Done**. |
| **Route by topic** | Gives each topic you choose its own exit, such as payroll to one path and benefits to another. Topics you don't choose leave by **Anything else**. |

Conditions can check the AI's confidence, the topic, the highest risk found, whether a risk was flagged, whether a supporting document was found, whether the reply asks the employee for details, the sender's email or domain, the subject, the message text, the hour received, how many replies have been written, and how many automatic replies this sender has had in 24 hours. That last one stops back-and-forth loops with one person.

#### Actions

| Block | What it does |
| --- | --- |
| **Send alert** | Notifies a person or team, such as the HR Director, without ending the case. Alerts currently appear in the case and the Activity log. They are not emailed. The message then carries on to the next block. |

#### Ticket (Zoho Desk)

These blocks update the ticket and then carry on to the next block. Until Zoho Desk is connected, they only record what they would have done, and you can see that on each case.

| Block | What it does |
| --- | --- |
| **Set ticket status** | Changes the ticket's status to Open, Pending, Answered, Escalated or Closed. |
| **Tag ticket** | Adds labels so staff can filter and search. It can add the name of every risk that was flagged, plus any fixed tags you list. |
| **Assign ticket** | Assigns the ticket to a person or team and carries on. This is different from **Escalate / assign owner**, which ends the case. |

#### Finish the case

Every path ends at one of these blocks. They have no exits.

| Block | What it does |
| --- | --- |
| **Email sent** | Prepares the reply for the employee. With **A person approves first** on, the reply goes to the Review queue as ready to send. Turned off, it sends automatically, which is not available on this installation. If no reply has been written yet, the case is held for a person. |
| **Send to review queue** | Puts the case and the AI draft in the Review queue for a person to read, edit and send. It can be marked **Urgent**. **Reviewer must confirm** adds a tick box that must be ticked before Send turns on, and it is always required for careful, high-risk replies. |
| **Escalate / assign owner** | Marks the case as escalated and suggests who should own it. It appears at the top of the Review queue, and any draft is kept for the owner to rewrite. |
| **Close without reply** | Ends the case with no reply, for example spam or an out-of-scope message. The case stays in the Review queue under **Handled**. |

#### Reading the exits

Exit labels are colour-coded as well as named, so paths are easy to tell apart. **Flagged** and **No** are red, **Clear**, **Yes** and **Done** are green, and **Repeat**, **Match** and topic paths are blue.

### Importing requests and checking accuracy

In **Import and evaluate**, choose:

- **Check accuracy:** runs requests through the Workflow and produces a scorecard without adding them to the Review queue. Add `expected_topic` and `expected_risk` columns to compare results with your expectations. Use `yes` or `no` for expected risk.
- **Add to Review queue:** drafts requests and holds them for a person. Imported requests are never sent automatically.

Both modes use the AI when the AI engine is enabled, so they may use your AI allowance.

### Preparing knowledge files

1. Open **Knowledge files** and select **Upload files**.
2. Upload a readable `.txt`, `.md`, or `.csv` file, or choose **Paste text as a document**.
3. Choose an appropriate folder.
4. Make sure the file’s **AI can use** switch is on.
5. Use **View** to check the document as the AI sees it.

**PDF and Word files can currently be stored, but their contents are not read by the AI.** Paste their policy text or provide a supported text file.

Keep policies current and clearly written, with one topic per paragraph where possible. Turn off **AI can use** to stop using a file without deleting it. Deleting a file is permanent.

### Managing connections

Zoho Desk and Egnyte require connection setup by your technical administrator. Credentials are configured on the server.

In **Settings → Connections**, administrators can:

- Check connection status and run connection tests.
- Control whether new Zoho Desk tickets are pulled.
- Choose whether incoming AI drafts become private ticket notes.
- Control whether Workflow actions update ticket status, tags, and assignments.
- Choose what happens when a person approves a reply.
- Select and sync an Egnyte policy folder after the connection is configured.

Only link Egnyte folders containing policies and guides suitable for quoting to employees. Do not link case files, personal records, or pay data.

Settings changes save automatically and apply to the next email.

## Practicing safely

Use **Test emails** to write a made-up employee message or choose an example. The results show the draft, flags, and explanation.

Use **Test a document** to try a practice document and ask a question about it.

The Test Lab does not read or send real email, and test emails never touch Zoho Desk. Messages and documents may still be sent to the configured AI service, so use made-up or anonymized information.

## Good practice

- Check the policy passages, not just the draft.
- Treat AI output as a draft that needs your judgment.
- Use made-up or anonymized information when testing.
- Run **Check accuracy** after changing the Workflow or policies.
- Handle sensitive cases through your normal HR process when the assistant’s draft is unsuitable.
- Review connection and approval settings before relying on ticket updates or delivery.

## Before your team starts

Administrators should confirm that:

- Readable policy documents are available and enabled for AI use.
- The Workflow routes requests as intended.
- Reviewers have access to the pages they need.
- Requests can be imported, or Zoho Desk is connected.
- The approval destination is correct.

Automatic sending is currently disabled on this server. The application supports it if separately enabled by a technical administrator, so review this guide if that configuration changes.

Need help? Ask your administrator or consult the [installation](https://github.com/Ross-Business-Tech/Beztak-Project-2/blob/development/docs/install.md), [Zoho Desk](https://github.com/Ross-Business-Tech/Beztak-Project-2/blob/development/docs/zoho-desk.md), [Egnyte](https://github.com/Ross-Business-Tech/Beztak-Project-2/blob/development/docs/egnyte.md), and [security](https://github.com/Ross-Business-Tech/Beztak-Project-2/blob/development/docs/security-privacy.md) guides.
