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

## Administrator tasks

| Page | What to do there |
| --- | --- |
| **Import and evaluate** | Paste CSV or JSON, or upload a CSV, with up to 200 requests. Required columns are `subject` and `body`. Optional columns include `name`, `from`, and `received_at`. |
| **Knowledge files** | Add policy text the assistant may use. Organize files into folders and control which files the AI can use. |
| **Workflow** | Edit how requests are understood, flagged, drafted, escalated, and routed. Use the design check to identify paths that could send flagged or unchecked messages without a person. |
| **Access** | Add people by email, assign Reviewer or Admin, and choose which optional pages reviewers can open. |
| **Settings** | Choose the AI engine, check its connection, set reply style, and manage available Zoho Desk and Egnyte controls. |
| **Dashboard** | View volumes, automation rate, and work needing attention. |
| **Activity log** | Review recorded changes and actions. |

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
