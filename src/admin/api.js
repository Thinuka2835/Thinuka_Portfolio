// Admin API client. Same-origin, JSON only; the session lives in an HttpOnly
// cookie the browser sends automatically. Any 401 signs the UI out — the
// server is what actually enforces access.

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || `Request failed (${status})`)
    this.status = status
    this.code = body?.error?.code
    this.fields = body?.error?.fields || {}
    this.details = body?.error || {}
  }
}

const listeners = new Set()
export const onUnauthorized = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export async function api(method, path, body) {
  let res
  try {
    res = await fetch(`/api/admin${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(method !== 'GET' && method !== 'DELETE' ? { 'Content-Type': 'application/json' } : {}),
      },
      body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(body ?? {}) : undefined,
    })
  } catch {
    throw new ApiError(0, { error: { code: 'network', message: 'Can’t reach the server. Check your connection and try again.' } })
  }
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new ApiError(res.status, json)
    if (res.status === 401 && !path.startsWith('/auth/login')) listeners.forEach((fn) => fn(err))
    throw err
  }
  return json
}

export const get = (p) => api('GET', p)
export const post = (p, b) => api('POST', p, b)
export const put = (p, b) => api('PUT', p, b)
export const patch = (p, b) => api('PATCH', p, b)
export const del = (p) => api('DELETE', p)
