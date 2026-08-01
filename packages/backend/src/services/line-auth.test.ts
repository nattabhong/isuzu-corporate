import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getLineProfile,
  exchangeLineCode,
  createJwt,
} from './line-auth.js'
import { jwtVerify } from 'jose'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('LINE Auth Service', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('getLineProfile', () => {
    it('fetches LINE profile with access token', async () => {
      const mockProfile = {
        userId: 'U123456',
        displayName: 'Test User',
        pictureUrl: 'https://example.com/pic.jpg',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      })

      const profile = await getLineProfile('test-access-token')

      expect(profile).toEqual(mockProfile)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/profile',
        { headers: { Authorization: 'Bearer test-access-token' } }
      )
    })

    it('throws error when profile fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      await expect(getLineProfile('invalid-token')).rejects.toThrow('ไม่สามารถดึงข้อมูล LINE profile ได้')
    })
  })

  describe('exchangeLineCode', () => {
    it('exchanges authorization code for tokens', async () => {
      const mockTokenResponse = {
        access_token: 'access-123',
        id_token: 'id-456',
        refresh_token: 'refresh-789',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })

      const result = await exchangeLineCode(
        'auth-code-xyz',
        'channel-id',
        'channel-secret',
        'https://example.com/callback',
      )

      expect(result.access_token).toBe('access-123')
      expect(result.id_token).toBe('id-456')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/oauth2/v2.1/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: expect.any(URLSearchParams),
        }
      )

      // Verify the body contains correct params
      const callBody = mockFetch.mock.calls[0][1].body as URLSearchParams
      expect(callBody.get('grant_type')).toBe('authorization_code')
      expect(callBody.get('code')).toBe('auth-code-xyz')
      expect(callBody.get('client_id')).toBe('channel-id')
      expect(callBody.get('client_secret')).toBe('channel-secret')
      expect(callBody.get('redirect_uri')).toBe('https://example.com/callback')
    })

    it('throws error when token exchange fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      })

      await expect(
        exchangeLineCode('bad-code', 'id', 'secret', 'https://cb'),
      ).rejects.toThrow('การแลกเปลี่ยน LINE token ล้มเหลว')
    })
  })

  describe('createJwt', () => {
    it('creates a valid HS256 JWT that can be verified', async () => {
      const payload = {
        id: 'member-1',
        role: 'manager',
        name: 'Test Manager',
      }
      const secret = 'my-secret-key'

      const token = await createJwt(payload, secret)

      // Verify we can decode it
      const { payload: decoded } = await jwtVerify(
        token,
        new TextEncoder().encode(secret),
      )
      expect(decoded.id).toBe('member-1')
      expect(decoded.role).toBe('manager')
      expect(decoded.name).toBe('Test Manager')
      expect(decoded.exp).toBeDefined()
      expect(decoded.iat).toBeDefined()
    })

    it('creates a token that expires in ~1 hour', async () => {
      const payload = { id: 'user', role: 'sales_rep', name: 'Rep' }
      const secret = 'secret'

      const token = await createJwt(payload, secret)
      const { payload: decoded } = await jwtVerify(
        token,
        new TextEncoder().encode(secret),
      )

      const iat = decoded.iat as number
      const exp = decoded.exp as number
      // Should expire roughly 1 hour after issue
      expect(exp - iat).toBe(3600)
    })

    it('creates a token that fails verification with wrong secret', async () => {
      const payload = { id: 'user', role: 'sales_rep', name: 'Rep' }
      const token = await createJwt(payload, 'correct-secret')

      await expect(
        jwtVerify(token, new TextEncoder().encode('wrong-secret')),
      ).rejects.toThrow()
    })
  })
})
