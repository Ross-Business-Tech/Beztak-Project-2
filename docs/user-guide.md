# HR Help Desk AI: User Guide

For reviewers and administrators. The assistant drafts replies from your policy documents. **A person always reviews and approves before anything is sent.**

## Getting started

Sign in with the email and password your administrator gave you. Reviewers open on the **Review queue**; administrators open on the **Dashboard**. On a phone, use the menu button at the top left.

| | Reviewer | Administrator |
|---|---|---|
| Review queue, Import, Test emails | Yes | Yes |
| Dashboard, Workflow, Knowledge files, Activity log | Only if an admin opens them (Workflow and files are view-only) | Yes |
| Settings and Access | No | Yes |

**How a request is handled**

1. A request arrives from a spreadsheet import or from Zoho Desk.
2. The Workflow flags risky topics and routes the request.
3. The assistant drafts a reply and quotes the policy passages it used.
4. A person reviews it in the Review queue.

Harassment, discrimination, legal, safety and mental-health topics always go to a person.

## Reviewing requests

1. Open the **Review queue**. The most urgent, longest-waiting cases are first.
2. Read the original message, then the **draft reply**. The confidence meter shows how sure the assistant is.
3. Check **Sources** for the policy passages behind the draft. If none are found, write the answer yourself. **Why it's here** explains any flag.
4. Edit the reply, then choose:
   - **Send / approve:** records your reply, then opens the next case.
   - **Save draft** or **Regenerate:** keep your work or get a fresh draft.
   - **Close without reply.**
5. On a red **high-risk** case, tick the confirmation box before you can send.

Use **Case notes** for private internal comments; they are never sent to the employee. By default an approved reply is saved as a private note on the Zoho Desk ticket, and HR sends it from there.

## Administrator tasks

| Page | What to do there |
|---|---|
| **Import and evaluate** | Paste or upload a CSV (up to 200 rows; needs `subject` and `body`). Choose **Check accuracy** for a scorecard, or **Add to Review queue**. Add `expected_topic` and `expected_risk` columns to measure accuracy. |
| **Knowledge files** | Upload the PDF, Word or text policies the assistant may answer from. Files marked "Not readable yet" (for example scanned PDFs) can't be used. |
| **Workflow** | Edit how requests are flagged, escalated and routed. A built-in check warns if a flagged message could be sent with no person involved. |
| **Access** | Add people by email, set Reviewer or Administrator, and choose which optional pages reviewers can open. Keep at least one administrator. |
| **Settings** | Pick the AI engine and run **Check the AI connection**. Set tone, signature and AI disclosure footer. Connect Zoho Desk or Egnyte. |
| **Dashboard and Activity log** | See volumes, time saved, topics and flags, and a record of who changed what. |

**Test emails** and **Test a document** let you practice with made-up messages. Nothing there touches real tickets.

## Good practice

- Read the sources, not just the reply.
- Use made-up or anonymized data when testing.
- Run **Check accuracy** again after changing the Workflow or policies.
- If a case feels sensitive, close it and handle it yourself.

## Limits

Only the first message of a ticket is read; attachments are not. Alerts are logged, not emailed.

Need help? Ask your administrator, or see the [install](install.md), [Zoho Desk](zoho-desk.md), [Egnyte](egnyte.md) and [security](security-privacy.md) guides.
