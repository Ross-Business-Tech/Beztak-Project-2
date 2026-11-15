# HR Help Desk AI: User Guide

For the people who use the help desk every day: reviewers and administrators. No technical knowledge needed.

**In one sentence:** employees send HR a question, the assistant drafts a reply using your own policy documents, and **a person always reads, edits and approves it** before anything is sent.

---

## Page 1: The basics

### Who can do what

| | Reviewer | Administrator |
|---|---|---|
| Work through the Review queue | Yes | Yes |
| Use Import and evaluate, Test emails, Test a document | Yes (on by default) | Yes |
| See the Dashboard, Workflow, Knowledge files, Activity log | Only if an admin opens them | Yes |
| Change the Workflow, upload or delete files | No (view only) | Yes |
| Settings and Access | No | Yes |

Administrators choose what reviewers can open on the **Access** page.

### Signing in

Open the site and sign in with the email and password your administrator gave you. Reviewers land on the **Review queue**; administrators land on the **Dashboard**. On a phone, tap the menu button (top left) to move between pages.

If you open the site in its **test version** (no sign-in), it uses sample data kept in your own browser. Nothing is read or sent, and what you do is not shared with colleagues. A banner at the top tells you which version you are in.

### How a message moves through the help desk

1. **A request arrives.** It comes in from a spreadsheet you import (or from Zoho Desk, if your team has connected it).
2. **The Workflow takes over.** It is a set of steps your team designed. It flags risky topics, sorts the request by subject, and decides where it goes next.
3. **The assistant drafts a reply.** It reads the request, finds the matching passages in your Knowledge files, and writes a reply that quotes its sources.
4. **A person reviews it.** The case waits in the Review queue until someone approves, edits or closes it.

The assistant only reads and drafts. The Workflow decides what happens to each message. **Harassment, discrimination, legal threats, safety and mental-health topics are always sent to a person.**

---

## Page 2: Everyday work (Review queue)

This is where reviewers spend their time.

### The queue

- Cases are sorted with the **most urgent and longest-waiting first**. Each shows how long it has been waiting.
- Use the filter at the top to switch between open cases and all cases.
- Tap a case to open it.

### Reviewing one case

On a computer the original email and the draft sit side by side. On a phone you see the original email first, then the **draft reply**, with the other details folded away underneath.

1. **Read the original message.**
2. **Read the draft reply.** The meter shows how confident the assistant is, in plain words. Lower confidence means read more carefully.
3. **Check the details if you need them** (tap to open):
   - **Why it's here:** what was flagged or why a person is needed.
   - **Sources:** the exact policy passages the reply is based on. If it says *No supporting document found*, write the answer yourself.
   - **Case notes:** private notes for your team. Never sent to the employee.
   - **History:** what has happened to this case.
   - **How it decided:** the step-by-step path it took through the Workflow.
4. **Edit the reply** in the box. Use **Save draft** to keep unfinished work, **Copy reply** to paste it somewhere else, or **Regenerate** to ask for a fresh draft.
5. **Finish the case:**
   - **Approve / send** records your approved reply. After you finish, the next case opens automatically.
   - **Close without reply** closes it with no answer.

### High-risk cases

A red box means the topic is sensitive. The draft is deliberately cautious. You must tick **"I have read this message and edited the reply as needed"** before the send button works. Rewrite the reply in your own words where needed.

### What "send" really does

Nothing is emailed to an employee unless an administrator has turned that on. By default an approved reply is **saved as a private note on the Zoho Desk ticket** (or recorded in the app if Zoho is not connected), and HR sends it from there.

---

## Page 3: Administrators

### Dashboard
Last 7 days at a glance: how many requests, how many are waiting, time saved, what people are asking about, and what was flagged. Use **Open queue**, **Edit rules** and **See all** to jump to the right page.

### Import and evaluate
Bring in requests from a spreadsheet (up to 200 at a time) and choose what to do with them:

- **Check accuracy:** runs every request through your Workflow *without* adding anything to the queue and gives you a **scorecard**. Add `expected_topic` and `expected_risk` (yes or no) columns and it shows how often the assistant agrees with you. Use **Save this check** to compare results after you change the Workflow or documents.
- **Add to Review queue:** each request is drafted and waits for a person.

The spreadsheet needs a `subject` and a `body` column. `name`, `from` and `received_at` are optional. Use **Download a sample file** to see the format. Use made-up or anonymized requests when testing, and remove names and ID numbers first.

### Knowledge files
The documents the assistant is allowed to answer from: policies, FAQs, guides. Upload PDF, Word or text files, and open a file to see what the assistant can read. A file marked **Not readable yet** (for example a scanned PDF with no text) cannot be used. If Egnyte is connected, its files appear here marked **Egnyte** and are kept up to date automatically.

### Workflow
The visual editor where you decide how every request is handled: what is flagged, what is escalated, which team owns it, and when a person must review. Changes apply to the next request. A built-in check warns you if a path could send a flagged message with no person involved.

### Access
Add people by email, choose **Reviewer** or **Administrator**, and choose which optional pages reviewers can open (each is shown as **Open** or **Hidden**). Keep at least one administrator. Changes apply right away.

### Settings
Choose the AI engine and use **Check the AI connection** to confirm it works. Set the reply tone, signature and the "prepared with the help of an AI assistant" footer. Connect Zoho Desk or Egnyte (live server only), and set the minutes-saved figure the Dashboard uses.

### Activity log
A record of who changed what and what the help desk did.

### Test emails and Test a document
A safe practice area. Write a pretend employee email (or start from an example) and see the draft, the sources and the reasoning. Upload a practice policy, then ask a question about it to check the assistant uses it. Nothing here touches real tickets.

---

## Good habits

- Always read the sources, not just the reply.
- Use made-up data when practicing. Do not paste real employee information into the test areas.
- After changing the Workflow or uploading new policies, run **Check accuracy** again.
- If a case feels wrong or sensitive, close it without a reply and handle it yourself.

## Limits to know about

- Only the first message of a ticket is read; later replies and attachments are not.
- Alerts such as "Alert HR Director" are recorded in the Activity log, not emailed.
- Scanned PDFs cannot be read.
- Zoho Desk and Egnyte have been tested against stand-ins, not a real account. Run the connection tests in Settings first.

## Need help?

Ask your administrator, or see the technical guides: [install](install.md), [Zoho Desk](zoho-desk.md), [Egnyte](egnyte.md) and [security and privacy](security-privacy.md).
