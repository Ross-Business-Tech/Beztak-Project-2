// One-time helper: turns the code from the Zoho API console into a refresh token.
//   node server/zoho-token.js <region> <client_id> <client_secret> <code>
// The refresh token is printed to your terminal only. Put it in your .env as ZOHO_REFRESH_TOKEN.
const [region = 'us', clientId, clientSecret, code] = process.argv.slice(2)
if (!clientId || !clientSecret || !code) { console.error('Usage: node server/zoho-token.js <region> <client_id> <client_secret> <code>'); process.exit(1) }
const tld = { us: 'com', eu: 'eu', in: 'in', au: 'com.au', jp: 'jp', ca: 'zohocloud.ca', sa: 'zoho.sa', uk: 'zoho.uk', cn: 'com.cn' }[region.toLowerCase()] || region
const root = tld.startsWith('zoho') ? tld : `zoho.${tld}`
const url = new URL(`https://accounts.${root}/oauth/v2/token`)
url.search = new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, code })
const res = await fetch(url, { method: 'POST' })
const j = await res.json().catch(() => ({}))
if (!j.refresh_token) { console.error('Zoho did not return a refresh token:', j.error || res.status, '\nThe code expires after a few minutes. Generate a new one and try again.'); process.exit(1) }
console.log(`\nZOHO_REFRESH_TOKEN=${j.refresh_token}\n`)
