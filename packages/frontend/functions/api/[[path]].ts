/// <reference types="@cloudflare/workers-types" />
// Cloudflare Pages Functions — proxy /api/* to the Workers backend
// This keeps the frontend and API on the SAME origin so cookies work
// (SameSite=Lax) and no CORS issues in production.
const API_BASE = 'https://isuzu-corporate-api.copilot-ai.workers.dev'

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  const apiUrl = `${API_BASE}${url.pathname}${url.search}`

  const headers = new Headers(context.request.headers)
  headers.delete('host')
  headers.delete('cf-connecting-ip')
  headers.delete('cf-ray')

  const init: RequestInit = {
    method: context.request.method,
    headers,
    redirect: 'manual',
  }

  // Forward body for non-GET/HEAD requests
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    init.body = context.request.body
    // @ts-expect-error duplex required for streaming bodies in Workers fetch
    init.duplex = 'half'
  }

  const response = await fetch(apiUrl, init)

  // Rebuild response (headers from the API may include Set-Cookie — pass through)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
