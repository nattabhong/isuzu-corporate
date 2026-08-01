export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiClient {
  get<T = unknown>(url: string): Promise<T>
  post<T = unknown>(url: string, body?: unknown): Promise<T>
  patch<T = unknown>(url: string, body?: unknown): Promise<T>
  delete<T = unknown>(url: string): Promise<T>
  setToken(token: string): void
  clearToken(): void
}

const DEFAULT_TIMEOUT_MS = 15_000

export function createApiClient(): ApiClient {
  let token: string | null = null

  async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    const options: RequestInit = {
      method,
      headers,
      credentials: 'include',
      signal: controller.signal,
    }

    if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
      options.body = JSON.stringify(body)
    }

    let response: Response
    try {
      response = await fetch(url, options)
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError('Request timed out', 408)
      }
      throw new ApiError(
        err instanceof Error ? err.message : 'Network error',
        0,
      )
    } finally {
      clearTimeout(timeoutId)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    // Parse body — try JSON first, fall back to text
    let data: unknown
    const text = await response.text().catch(() => null)
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    } else {
      data = null
    }

    if (!response.ok) {
      const errData = data && typeof data === 'object' && 'error' in data
        ? (data as Record<string, unknown>).error
        : undefined
      throw new ApiError(
        String(errData || `Request failed with status ${response.status}`),
        response.status,
        data,
      )
    }

    return data as T
  }

  return {
    get<T>(url: string) {
      return request<T>('GET', url)
    },
    post<T>(url: string, body?: unknown) {
      return request<T>('POST', url, body)
    },
    patch<T>(url: string, body?: unknown) {
      return request<T>('PATCH', url, body)
    },
    delete<T>(url: string) {
      return request<T>('DELETE', url)
    },
    setToken(t: string) {
      token = t
    },
    clearToken() {
      token = null
    },
  }
}
