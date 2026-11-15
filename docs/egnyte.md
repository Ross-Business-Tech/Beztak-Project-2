# Linking an Egnyte folder

Admins can point the assistant at one Egnyte folder. The AI then answers from the policies and guides in it. The connection is **read-only**: the app lists folders and downloads files, and never creates, changes or deletes anything in Egnyte.

## How it works

1. You set the Egnyte domain and an access token on the server (environment variables).
2. In the app, **Settings > Egnyte documents**: press **Browse**, pick the folder, switch on **Use these documents**.
3. The server copies every readable file in that folder (and, if you leave it on, its sub-folders) into the app, then re-checks every hour (`EGNYTE_SYNC_MINUTES`). Only changed files are downloaded again. Files deleted in Egnyte disappear from the app at the next check.
4. The files appear in **Knowledge files** with an "Egnyte" badge. You can switch a file off for the AI there. To change a file's content, edit it in Egnyte.
5. For each request, the AI is given the documents that best match it. If the library is large, long documents are cut down to their best-matching paragraphs. Quotes in a draft are checked against the full document text.

Supported files: PDF, Word (`.docx`), plain text, Markdown, CSV and HTML. Not supported: scanned PDFs that are only pictures, old `.doc`, Excel, PowerPoint, images. Unsupported, oversized (default 5 MB) and extra files (default first 200) are skipped, and Settings lists them with the reason.

## What to link

Link a folder that holds **only** policies and guides that are fine to quote to employees. Anything in it may be sent to the AI provider and appear in a drafted reply. Do not link folders with case files, personal records or pay data. Anyone who can edit the folder in Egnyte can change what the assistant says, so keep edit rights on it tight.

## Setup

1. **Create a dedicated Egnyte user** for this tool with **view-only** access to just the policy folder. The token you create inherits that user's access, so this limits what the app can ever see.
2. **Get an API key and an access token for that user** following Egnyte's own guides (they change over time, so check them first):
   - Getting started and API keys: https://developers.egnyte.com/integration/cfs/api-docs/getting-started
   - Authentication and tokens: https://developers.egnyte.com/integration/cfs/api-docs/authentication
   - Egnyte's help article on generating credentials from the Apps and Integrations store: https://helpdesk.egnyte.com/hc/en-us/articles/46198042114445
3. **Set the server variables** (see `.env.example`):

   ```
   EGNYTE_DOMAIN=beztak          # the part before .egnyte.com
   EGNYTE_ACCESS_TOKEN=<the token>
   ```

   On Render, add them under Environment and restart.
4. In the app: **Settings > Egnyte documents > Test connection** should say Connected. Then Browse, pick the folder, and switch it on.

## Keeping it working

- **Tokens can expire.** Egnyte's current documentation says access tokens expire after 30 days (older pages say they do not), and a token stops working immediately if the user changes their password or access is revoked. When that happens the app shows a red banner and the Egnyte card says the token was rejected. The AI keeps using the copies it already has. Create a new token and update `EGNYTE_ACCESS_TOKEN`. Put a reminder in a calendar for 25 days after you set it. A refresh-token flow is a planned improvement.
- **Rate limits.** The app waits about 0.3 seconds between Egnyte requests (`EGNYTE_REQUEST_DELAY_MS`) and retries once if Egnyte asks it to slow down.
- **Removing it.** Switch off "Use these documents" to stop the AI using them, or **Remove synced copies** to delete the copies from the app. Nothing in Egnyte is touched either way.

## Limits and what has been verified

- The connection code is tested against a **stand-in Egnyte server** that mimics the folder-listing and file-download calls, with real Word and PDF files. It has **not been tried against a live Egnyte account**. Use Test connection and a small folder first, and check that a few known policy questions get the right quotes (the Import and evaluate page is built for this).
- One folder per installation, up to 6 levels of sub-folders.
- Egnyte "links" (shared URLs) are not used; give the app a folder path.
- The app does not pass Egnyte's own permissions through to individual reviewers. Everyone who can see a draft can see the quoted text.
