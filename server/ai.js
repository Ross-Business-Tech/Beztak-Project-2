// The server calls the AI provider directly and keeps the key.
//  - anthropic (default): Claude through the official Anthropic SDK. Model "claude-haiku-5-5" unless changed.
//  - openai: any OpenAI-compatible service (OpenRouter, OpenAI, Azure OpenAI, Ollama, vLLM, LiteLLM...).
// The workflow engine speaks one simple format (a chat request in, text out). This file translates it.
import Anthropic from '@anthropic-ai/sdk'

export const aiConfigured = (ai) => Boolean(ai.apiKey) || ai.allowNoKey

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const noKey = () => json(404, { error: { message: 'No AI key is configured on this server (set AI_API_KEY).' } })

// Settings may still carry an OpenRouter-style name such as "anthropic/claude-haiku-5-5". Claude's own API wants the bare name.
export function claudeModelId(name, fallback) {
  const bare = String(name || '').trim().replace(/^anthropic\//, '')
  return /^claude-[a-z0-9-]+$/.test(bare) ? bare : fallback
}

function anthropicTransport(ai) {
  let client = null
  const get = () => (client ??= new Anthropic({ apiKey: ai.apiKey, baseURL: ai.baseUrl, maxRetries: 2, timeout: 60_000 }))
  return async (_url, init) => {
    if (!ai.apiKey) return noKey()
    const req = JSON.parse(init?.body || '{}')
    const system = (req.messages || []).filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
    const messages = (req.messages || []).filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }))
    try {
      const msg = await get().messages.create({
        model: claudeModelId(req.model, ai.defaultModel),
        // Claude may think before answering, and that thinking counts toward this limit, so leave generous room.
        max_tokens: Math.max(Number(req.max_tokens) || 0, 8000),
        ...(system ? { system } : {}),
        messages,
      }, { signal: init?.signal })
      if (msg.stop_reason === 'refusal') return json(502, { error: { message: 'The AI declined to process this message.' } })
      const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
      return json(200, { choices: [{ message: { content: text } }] })
    } catch (e) {
      if (e instanceof Anthropic.APIError && e.status) return json(e.status, { error: { message: e.message } })
      throw e
    }
  }
}

function openAiTransport(ai, fetchImpl) {
  return async (_url, init) => {
    if (!aiConfigured(ai)) return noKey()
    return fetchImpl(`${ai.baseUrl}/chat/completions`, {
      method: 'POST', signal: init?.signal,
      headers: { 'Content-Type': 'application/json', ...(ai.apiKey ? { Authorization: `Bearer ${ai.apiKey}` } : {}) },
      body: init?.body,
    })
  }
}

export const makeTransport = (ai, fetchImpl = fetch) => (ai.provider === 'openai' ? openAiTransport(ai, fetchImpl) : anthropicTransport(ai))
