# Connecting Zoho Desk

You need to be an admin of your Zoho Desk account. Zoho changes its screens from time to time, so treat the menu names below as a guide and check Zoho's current API documentation if something differs.

## What the app does in Zoho Desk

| Action | Zoho Desk API | When |
|---|---|---|
| List new tickets | `GET /api/v1/tickets` and `GET /api/v1/tickets/{id}` | Every `POLL_SECONDS` |
| Save the AI draft as a private note | `POST /tickets/{id}/comments` with `isPublic: false` | When a ticket arrives (can be turned off) |
| Save an approved reply as a private note | same | When a reviewer approves (default) |
| Email an approved reply | `POST /tickets/{id}/sendReply` | Only if an admin chooses "Email the employee" |
| Set status | `PATCH /tickets/{id}` | When the workflow's status block runs (can be turned off) |
| Add tags | `POST /tickets/{id}/associateTag` | When the workflow's tag block runs |
| Assign | `PATCH /tickets/{id}` with `assigneeId` | When the workflow's assign block runs and `ZOHO_ASSIGNEES` maps the name |

It never deletes anything and never changes a ticket's content.

## Steps

1. **Find your region.** Look at the address you sign in at: `desk.zoho.com` is `us`, `desk.zoho.eu` is `eu`, `.in` is `in`, `.com.au` is `au`, `.jp` is `jp`. Set `ZOHO_REGION`.
2. **Find your Organization ID.** In Zoho Desk: *Setup > Developer Space > API* shows it. Set `ZOHO_ORG_ID`.
3. **(Recommended) Find the HR department id**, so the app reads only HR tickets. Set `ZOHO_DEPARTMENT_ID`. If you leave it empty, every department is read.
4. **Create API credentials.** Go to the Zoho API Console (`api-console.zoho.<your region>`), choose **Self Client**, and note the Client ID and Client Secret (`ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`).
5. **Generate a code.** In the Self Client's *Generate Code* tab, use these scopes, then create the code (it expires in a few minutes):

   ```
   Desk.tickets.ALL,Desk.contacts.READ,Desk.basic.READ
   ```

6. **Exchange the code for a refresh token:**

   ```bash
   node server/zoho-token.js us <client_id> <client_secret> <code>
   ```

   Put the printed value in `ZOHO_REFRESH_TOKEN`. Keep it secret: it is the key to your tickets.
7. Set `TICKETING_ADAPTER=zohodesk`, restart, and in **Settings > Connection to Zoho Desk** press **Test connection**.

## Safer way to start

1. Use a Zoho Desk **sandbox or test department** first, with made-up tickets.
2. Keep "Save the AI draft as a private note" on and "When a person approves" set to **private note**.
3. Leave `ALLOW_AUTO_SEND=false`.
4. Compare the AI drafts with what HR actually would have written for a few weeks before widening anything.

## What has and has not been verified

The connection code is covered by automated tests against a **stand-in** that mimics the Zoho Desk endpoints above. It has **not been run against a live Zoho Desk portal**. Before go-live, confirm with a real test ticket that: tickets are read with their full text, the private note appears, status and tags change, and (if used) the reply email goes out. If a field differs in your portal (for example custom statuses), adjust `INTAKE_STATUSES` and the status names in the workflow. Zoho's API has rate limits; at about 500 tickets a month and 5-minute checks, usage is far below them.

## Limits

- Only the first message of a ticket is read; employee follow-ups are not reprocessed.
- Attachments are not read.
- A ticket is processed once. If you want it processed again, use **Regenerate** in the review queue.
