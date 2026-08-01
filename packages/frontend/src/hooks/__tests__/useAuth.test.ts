import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAuth } from '../useAuth'

describe('useAuth', () => {
  let originalFetch: typeof globalThis.fetch
  let originalLocation: Location

  beforeEach(() => {
    originalFetch = globalThis.fetch
    originalLocation = window.location
    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
  })

  it('starts with loading true and user null', () => {
    const mockFetch = vi.fn().mockImplementation(
      () => new Promise(() => {}) // never resolves
    )
    globalThis.fetch = mockFetch

    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('fetches /api/auth/me on mount', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: null }), { status: 200 })
    )
    globalThis.fetch = mockFetch

    renderHook(() => useAuth())

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' })
    })
  })

  it('sets user when /api/auth/me returns user data', async () => {
    const userData = { id: '1', name: 'Test User', role: 'sales_rep' as const }
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: userData }), { status: 200 })
    )
    globalThis.fetch = mockFetch

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual(userData)
  })

  it('sets loading false and user null on fetch error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    globalThis.fetch = mockFetch

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
  })

  it('login redirects to /api/auth/line', () => {
    const mockFetch = vi.fn().mockImplementation(
      () => new Promise(() => {})
    )
    globalThis.fetch = mockFetch

    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.login()
    })

    expect(window.location.href).toBe('/api/auth/line')
  })

  it('logout calls POST /api/auth/logout and clears user', async () => {
    const userData = { id: '1', name: 'Test User', role: 'sales_rep' as const }
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: userData }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )
    globalThis.fetch = mockFetch

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.user).toEqual(userData)

    await act(async () => {
      await result.current.logout()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    expect(result.current.user).toBeNull()
  })

  it('handles unsuccessful /api/auth/me response', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 })
    )
    globalThis.fetch = mockFetch

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
  })
})
