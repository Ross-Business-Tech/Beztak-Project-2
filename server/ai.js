// The server calls the AI provider directly and keeps the key. Any OpenAI-compatible endpoint works
// (OpenRouter, OpenAI, Azure OpenAI, Ollama, vLLM, LiteLLM...).
export function aiConfigured(ai) { return Boolean(ai.apiKey) || ai.allowNoKey }

export function makeTransport(ai, fetchImpl = fetch) {
  return async (_url, init) => {
    if (!aiConfigured(ai)) {
      return new Response(JSON.stringify({ error: { message: 'No AI provider is configured on this server (set AI_API_KEY).' } }), { status: 404, headers: { 'content-type': 'application/json' } })
    }
    return fetchImpl(`${ai.baseUrl}/chat/completions`, {
      method: 'POST', signal: init?.signal,
      headers: { 'Content-Type': 'application/json', ...(ai.apiKey ? { Authorization: `Bearer ${ai.apiKey}` } : {}) },
      body: init?.body,
    })
  }
}
