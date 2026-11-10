// Talking to the self-hosted server. When the app is opened from the static demo site there is no server,
// detectServer() returns null and the app runs in demo mode (everything in the browser).
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

export async function api(method, path, body) {
  let res
  try {
    res = await fetch(path, {
      method, credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'x-hr-csrf': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch { throw new ApiError(0, 'Could not reach the server. Check your connection.') }
  let json = null
  try { json = await res.json() } catch { /* empty or not JSON */ }
  if (!res.ok) {
    if (res.status === 401 && path !== '/api/login') window.dispatchEvent(new Event('hr-signed-out'))
    throw new ApiError(res.status, json?.error || `The server answered with an error (${res.status}).`)
  }
  return json
}

export async function detectServer() {
  try {
    const r = await fetch('/api/health', { headers: { Accept: 'application/json' } })
    if (!(r.headers.get('content-type') || '').includes('application/json')) return null
    const j = await r.json()
    return j?.mode === 'server' ? j : null
  } catch { return null }
}
