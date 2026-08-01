/// <reference types="@cloudflare/workers-types" />
// Cloudflare Pages Functions — proxy /api/* to the Workers backend
// This keeps the frontend and API on the SAME origin so cookies work
// (SameSite=Lax) and no CORS issues in production.
const API_BASE = 'https://isuzu-corporate-api.copilot-ai.workers.dev'

export const onRequest: PagesFunction = async (context) => {
  try {
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

    // Buffer body for non-GET/HEAD requests
    if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
      init.body = await context.request.arrayBuffer()
    }

    const response = await fetch(apiUrl, init)

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Proxy request failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
