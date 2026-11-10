// All server settings come from environment variables (see .env.example). Nothing secret lives in the repo.
const env = process.env
const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(String(v)))
const int = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d }

// Zoho runs separate data centres. Pick the one your Zoho Desk account lives in (check the web address you sign in at).
const ZOHO_DOMAINS = { us: 'com', com: 'com', eu: 'eu', in: 'in', au: 'com.au', jp: 'jp', ca: 'zohocloud.ca', sa: 'zoho.sa', uk: 'zoho.uk', cn: 'com.cn' }

const egnyteDomain = (v) => String(v || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/\.egnyte\.com$/i, '')

export function loadConfig(e = env) {
  const region = String(e.ZOHO_REGION || 'us').toLowerCase()
  const tld = ZOHO_DOMAINS[region] || region
  const zohoRoot = tld.startsWith('zoho') ? tld : `zoho.${tld}`
  // The AI is Claude through Anthropic's own API by default. Set AI_PROVIDER=openai to use any OpenAI-compatible service instead.
  const provider = String(e.AI_PROVIDER || 'anthropic').toLowerCase() === 'openai' ? 'openai' : 'anthropic'
  const aiBase = (e.AI_BASE_URL || (provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://openrouter.ai/api/v1')).replace(/\/+$/, '')
  return {
    port: int(e.PORT, 8080),
    dataDir: e.DATA_DIR || './data',
    staticDir: e.STATIC_DIR || './dist',
    admin: { username: e.ADMIN_USERNAME || 'admin', password: e.ADMIN_PASSWORD || '' },
    cookieSecure: String(e.COOKIE_SECURE || 'auto').toLowerCase(), // auto | true | false
    // true when a platform proxy (Render, Fly, a load balancer) sits in front: use its forwarded visitor address
    trustProxy: bool(e.TRUST_PROXY, false),
    sessionHours: int(e.SESSION_HOURS, 12),
    // Safety switch: nothing is ever sent to an employee automatically unless this is on AND the workflow allows it.
    allowAutoSend: bool(e.ALLOW_AUTO_SEND, false),
    ai: {
      provider,
      baseUrl: aiBase,
      apiKey: e.AI_API_KEY || (provider === 'anthropic' ? e.ANTHROPIC_API_KEY : e.OPENROUTER_API_KEY) || '',
      defaultModel: e.AI_MODEL || (provider === 'anthropic' ? 'claude-haiku-5-5' : 'anthropic/claude-sonnet-4.5'),
      // A local OpenAI-compatible model (Ollama, vLLM) needs no key. Claude always does.
      allowNoKey: provider === 'openai' && bool(e.AI_ALLOW_NO_KEY, aiBase !== 'https://openrouter.ai/api/v1'),
    },
    ticketing: {
      adapter: String(e.TICKETING_ADAPTER || 'none').toLowerCase(), // none | zohodesk
      pollSeconds: Math.max(30, int(e.POLL_SECONDS, 300)),
      backfillDays: Math.max(0, int(e.BACKFILL_DAYS, 0)),
      intakeStatuses: e.INTAKE_STATUSES || 'Open',
      departmentId: e.ZOHO_DEPARTMENT_ID || '',
    },
    // Egnyte (optional): a folder of documents the AI may answer from. Read-only.
    egnyte: (() => {
      const domain = egnyteDomain(e.EGNYTE_DOMAIN)
      return {
        domain,
        baseUrl: (e.EGNYTE_URL || (domain ? `https://${domain}.egnyte.com` : '')).replace(/\/+$/, ''),
        token: e.EGNYTE_ACCESS_TOKEN || '',
        syncMinutes: Math.max(5, int(e.EGNYTE_SYNC_MINUTES, 60)),
        maxFiles: Math.min(1000, Math.max(1, int(e.EGNYTE_MAX_FILES, 200))),
        maxFileBytes: Math.min(25, Math.max(1, int(e.EGNYTE_MAX_FILE_MB, 5))) * 1024 * 1024,
        delayMs: Math.max(0, int(e.EGNYTE_REQUEST_DELAY_MS, 300)), // Egnyte limits requests per second
      }
    })(),
    zoho: {
      region,
      deskUrl: (e.ZOHO_DESK_URL || `https://desk.${zohoRoot}`).replace(/\/+$/, ''),
      accountsUrl: (e.ZOHO_ACCOUNTS_URL || `https://accounts.${zohoRoot}`).replace(/\/+$/, ''),
      orgId: e.ZOHO_ORG_ID || '',
      clientId: e.ZOHO_CLIENT_ID || '',
      clientSecret: e.ZOHO_CLIENT_SECRET || '',
      refreshToken: e.ZOHO_REFRESH_TOKEN || '',
      // Optional: map the assignee names used in the workflow to Zoho agent ids, e.g. {"HR Manager":"1234567890"}
      assignees: (() => { try { return JSON.parse(e.ZOHO_ASSIGNEES || '{}') } catch { return {} } })(),
    },
  }
}
