// The server calls the AI provider directly and keeps the key.
//  - anthropic (default): Claude through the official Anthropic SDK. Model "claude-haiku-5-5" unless changed.
//  - openai + api.openai.com: OpenAI itself (an OpenAI or "Codex" key) through its Responses API. Model "gpt-5-mini" unless changed.
//  - openai + any other address: an OpenAI-compatible chat service (OpenRouter, Azure OpenAI, Ollama, vLLM, LiteLLM...).
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
      return json(200, { choices: [{ message: { content: text } }], usage: { prompt_tokens: msg.usage?.input_tokens, completion_tokens: msg.usage?.output_tokens } })
    } catch (e) {
      if (e instanceof Anthropic.APIError && e.status) return json(e.status, { error: { message: e.message } })
      throw e
    }
  }
}

function openAiTransport(ai, fetchImpl) {
  return async (_url, init) => {
    if (!aiConfigured(ai)) return noKey()
    // Newer OpenAI-compatible models (and Azure-hosted ones, such as the UM GPT Toolkit) reject max_tokens and want max_completion_tokens.
    // Some models (the UM GPT Toolkit's gpt-5.6-terra among them) accept only the default temperature, so leave it out.
    let body = init?.body
    try {
      const parsed = JSON.parse(body)
      if ('max_tokens' in parsed) {
        parsed.max_completion_tokens = parsed.max_tokens
        delete parsed.max_tokens
      }
      delete parsed.temperature
      body = JSON.stringify(parsed)
    } catch { /* not JSON: send as it is */ }
    return fetchImpl(`${ai.baseUrl}/chat/completions`, {
      method: 'POST', signal: init?.signal,
      headers: { 'Content-Type': 'application/json', ...(ai.apiKey ? { Authorization: `Bearer ${ai.apiKey}` } : {}) },
      body,
    })
  }
}

// Settings may carry a Claude or OpenRouter-style name ("anthropic/claude-haiku-5-5") from before. OpenAI wants its own bare names.
export function openAiModelId(name, fallback) {
  const bare = String(name || '').trim()
  return /^[a-z0-9][a-z0-9._:-]*$/i.test(bare) && !/^claude-/i.test(bare) ? bare : fallback
}

// OpenAI's Responses API works with every current OpenAI model, including the Codex ones, which the older chat API does
// not. Newer models think before answering and reject temperature, so it is left out and the output limit is generous.
function openAiResponsesTransport(ai, fetchImpl) {
  return async (_url, init) => {
    if (!ai.apiKey) return noKey()
    const req = JSON.parse(init?.body || '{}')
    const instructions = (req.messages || []).filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
    const input = (req.messages || []).filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }))
    const res = await fetchImpl(`${ai.baseUrl}/responses`, {
      method: 'POST', signal: init?.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.apiKey}` },
      body: JSON.stringify({
        model: openAiModelId(req.model, ai.defaultModel),
        ...(instructions ? { instructions } : {}),
        input,
        max_output_tokens: Math.max(Number(req.max_tokens) || 0, 8000),
        store: false,
      }),
    })
    if (!res.ok) return res
    let body
    try { body = await res.json() } catch { return json(502, { error: { message: 'OpenAI sent an unreadable answer.' } }) }
    const text = typeof body.output_text === 'string' && body.output_text
      ? body.output_text
      : (body.output || []).filter((o) => o.type === 'message').flatMap((o) => o.content || []).filter((c) => c.type === 'output_text').map((c) => c.text).join('')
    if (!text) {
      const refusal = (body.output || []).flatMap((o) => o.content || []).find((c) => c.type === 'refusal')
      if (refusal) return json(502, { error: { message: 'The AI declined to process this message.' } })
      return json(502, { error: { message: body.incomplete_details?.reason === 'max_output_tokens' ? 'The AI ran out of room before answering.' : 'The AI sent an empty answer.' } })
    }
    return json(200, { choices: [{ message: { content: text } }], usage: { prompt_tokens: body.usage?.input_tokens, completion_tokens: body.usage?.output_tokens } })
  }
}

export const makeTransport = (ai, fetchImpl = fetch) => (
  ai.api === 'responses' ? openAiResponsesTransport(ai, fetchImpl)
    : ai.provider === 'openai' ? openAiTransport(ai, fetchImpl)
      : anthropicTransport(ai))
