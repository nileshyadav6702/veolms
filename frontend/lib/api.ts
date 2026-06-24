const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

function getHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('veolms_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function throwIfError(res: Response) {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('veolms_token')
        localStorage.removeItem('veolms_user')
        window.location.href = '/login'
      }
    }
    let errorMsg = (data as { message?: string }).message ?? `HTTP ${res.status}`
    if (data.errors && typeof data.errors === 'object') {
      const details = Object.entries(data.errors)
        .map(([field, msgs]: any) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
        .join('\n')
      if (details) {
        errorMsg += `:\n${details}`
      }
    }
    const error = new Error(errorMsg) as any
    error.status = res.status
    error.code = (data as any).code
    error.sessions = (data as any).sessions
    throw error
  }
  return res.json()
}

export const api = {
  get: (path: string) =>
    fetch(BASE + path, { headers: getHeaders() }).then(throwIfError),
  post: (path: string, body: unknown) =>
    fetch(BASE + path, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }).then(throwIfError),
  put: (path: string, body: unknown) =>
    fetch(BASE + path, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }).then(throwIfError),
  patch: (path: string, body: unknown) =>
    fetch(BASE + path, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }).then(throwIfError),
  del: (path: string) =>
    fetch(BASE + path, { method: 'DELETE', headers: getHeaders() }).then(throwIfError),
}
