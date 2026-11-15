const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

let onSessionEnded: (() => void) | null = null

/**
 * Called when the server rejects the sign-in token we sent, for example after the password was
 * reset somewhere else. The app uses it to send the person back to the sign-in page.
 */
export function setSessionEndedHandler(handler: (() => void) | null) {
  onSessionEnded = handler
}

/** A 401 for a request that carried a token means the session is over. (A wrong password carries no token.) */
function checkSessionEnded(status: number) {
  if (status === 401 && authToken !== null) onSessionEnded?.()
}

interface RequestOptions {
  body?: unknown
  signal?: AbortSignal
}

function readErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const { message } = payload as { message: unknown }
    // The backend returns an array of messages when validation fails.
    if (Array.isArray(message)) return message.join('. ')
    if (typeof message === 'string') return message
  }
  return `Request failed with status ${status}`
}

async function request<T>(
  method: string,
  path: string,
  { body, signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload: unknown = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    checkSessionEnded(response.status)
    throw new ApiError(response.status, readErrorMessage(payload, response.status), payload)
  }

  return payload as T
}

/** Sends a file as multipart form data. The browser sets the Content-Type, including the boundary. */
async function sendForm<T>(method: string, path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const response = await fetch(`${BASE_URL}${path}`, { method, headers, body: form })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload: unknown = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    checkSessionEnded(response.status)
    throw new ApiError(response.status, readErrorMessage(payload, response.status), payload)
  }
  return payload as T
}

/**
 * Downloads a file that needs the sign-in token, so a plain link cannot be used.
 * Fetches it, then saves it through a temporary link.
 */
export async function downloadFile(path: string, fileName: string): Promise<void> {
  const headers: Record<string, string> = {}
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const response = await fetch(`${BASE_URL}${path}`, { headers })
  if (!response.ok) {
    const isJson = response.headers.get('content-type')?.includes('application/json')
    const payload: unknown = isJson ? await response.json() : await response.text()
    checkSessionEnded(response.status)
    throw new ApiError(response.status, readErrorMessage(payload, response.status), payload)
  }

  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const api = {
  upload: <T>(path: string, form: FormData) => sendForm<T>('PUT', path, form),
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}