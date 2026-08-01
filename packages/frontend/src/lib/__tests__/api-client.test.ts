import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApiClient, type ApiClient } from '../api-client'

describe('createApiClient', () => {
  let client: ApiClient
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    client = createApiClient()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('sends GET request with Authorization header when token is set', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: '1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    globalThis.fetch = mockFetch

    client.setToken('test-token-123')
    const result = await client.get('/api/customers')

    expect(mockFetch).toHaveBeenCalledWith('/api/customers', expect.objectContaining({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-123',
      },
      credentials: 'include',
    }))
    expect(result).toEqual({ success: true, data: { id: '1' } })
  })

  it('sends POST request with body and Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { name: 'Test' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    globalThis.fetch = mockFetch

    client.setToken('token-abc')
    const body = { name: 'Test Customer' }
    const result = await client.post('/api/customers', body)

    expect(mockFetch).toHaveBeenCalledWith('/api/customers', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token-abc',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    }))
    expect(result).toEqual({ success: true, data: { name: 'Test' } })
  })

  it('sends PATCH request with body', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    globalThis.fetch = mockFetch

    client.setToken('token')
    const result = await client.patch('/api/customers/1', { name: 'Updated' })

    expect(mockFetch).toHaveBeenCalledWith('/api/customers/1', expect.objectContaining({
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token',
      },
      credentials: 'include',
      body: JSON.stringify({ name: 'Updated' }),
    }))
    expect(result).toEqual({ success: true })
  })

  it('sends DELETE request without body', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    globalThis.fetch = mockFetch

    client.setToken('token')
    const result = await client.delete('/api/customers/1')

    expect(mockFetch).toHaveBeenCalledWith('/api/customers/1', expect.objectContaining({
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token',
      },
      credentials: 'include',
    }))
    expect(result).toEqual({ success: true })
  })

  it('throws an error on non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    globalThis.fetch = mockFetch

    client.setToken('token')

    await expect(client.get('/api/nonexistent')).rejects.toThrow('Not found')
  })

  it('sends request without Authorization header when token is not set', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    globalThis.fetch = mockFetch

    await client.get('/api/public')

    expect(mockFetch).toHaveBeenCalledWith('/api/public', expect.objectContaining({
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }))
  })

  it('clearToken removes the stored token', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    globalThis.fetch = mockFetch

    client.setToken('token')
    client.clearToken()
    await client.get('/api/something')

    expect(mockFetch).toHaveBeenCalledWith('/api/something', expect.objectContaining({
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }))
  })
})
