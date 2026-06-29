const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token))
  refreshSubscribers = []
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const url = BASE + path
  options.credentials = 'include'
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('veolms_token') : null
  options.headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(url, options)

  if (res.status === 401) {
    // If it's auth requests, do not attempt to refresh
    if (path === '/api/auth/refresh' || path === '/api/auth/login' || path === '/api/auth/signup') {
      await handleAuthFailure()
      throw await getResponseError(res)
    }

    if (!isRefreshing) {
      isRefreshing = true
      try {
        const refreshRes = await fetch(BASE + '/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })

        if (refreshRes.ok) {
          const data = await refreshRes.json()
          const newToken = data.token
          if (typeof window !== 'undefined') {
            localStorage.setItem('veolms_token', newToken)
            if (data.user) {
              localStorage.setItem('veolms_user', JSON.stringify(data.user))
            }
          }
          isRefreshing = false
          onRefreshed(newToken)
        } else {
          isRefreshing = false
          await handleAuthFailure()
          throw await getResponseError(res)
        }
      } catch (err) {
        isRefreshing = false
        await handleAuthFailure()
        throw err
      }
    }

    return new Promise((resolve, reject) => {
      subscribeTokenRefresh((newToken) => {
        const updatedHeaders = {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        }
        fetch(url, { ...options, headers: updatedHeaders })
          .then(async (retryRes) => {
            if (!retryRes.ok) {
              reject(await getResponseError(retryRes))
            } else {
              resolve(retryRes.json())
            }
          })
          .catch(reject)
      })
    })
  }

  if (!res.ok) {
    throw await getResponseError(res)
  }

  return res.json()
}

async function getResponseError(res: Response): Promise<Error> {
  const data = await res.json().catch(() => ({}))
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
  return error
}

async function handleAuthFailure() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('veolms_token')
    localStorage.removeItem('veolms_user')
    window.location.href = '/login'
  }
}

export const api = {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body: unknown) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  put: (path: string, body: unknown) =>
    request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  patch: (path: string, body: unknown) =>
    request(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  del: (path: string) => request(path, { method: 'DELETE' }),
}
