// Entry point: `node dist-server/index.js`. All settings come from environment variables (see .env.example).
import { loadConfig } from './config.js'
import { createApp } from './app.js'

const cfg = loadConfig()
const app = createApp(cfg, { seedSampleFiles: /^(1|true|yes|on)$/i.test(process.env.SEED_SAMPLE_FILES || '') })
app.svc.start()
app.server.listen(cfg.port, '0.0.0.0', () => {
  console.log(`HR Help Desk AI is running on port ${cfg.port}`)
  console.log(`  Ticketing: ${cfg.ticketing.adapter}   AI: ${cfg.ai.baseUrl}${cfg.ai.apiKey || cfg.ai.allowNoKey ? '' : ' (NO KEY SET: replies will use the simple built-in writer)'}   Auto-send: ${cfg.allowAutoSend ? 'ALLOWED' : 'off'}`)
})
const bye = () => { app.close(); process.exit(0) }
process.on('SIGINT', bye); process.on('SIGTERM', bye)
