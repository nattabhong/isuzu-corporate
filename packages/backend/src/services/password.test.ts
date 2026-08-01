import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('Password Service', () => {
  it('hashes password with pbkdf2 format', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).toMatch(/^pbkdf2\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/)
  })

  it('verifies correct password', async () => {
    const hash = await hashPassword('secret123')
    const ok = await verifyPassword('secret123', hash)
    expect(ok).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('secret123')
    const ok = await verifyPassword('wrongpass', hash)
    expect(ok).toBe(false)
  })

  it('produces different hashes for same password (random salt)', async () => {
    const h1 = await hashPassword('same-password')
    const h2 = await hashPassword('same-password')
    expect(h1).not.toBe(h2)
  })

  it('rejects malformed stored hash', async () => {
    const ok = await verifyPassword('anything', 'not-a-valid-hash')
    expect(ok).toBe(false)
  })

  it('rejects tampered hash payload', async () => {
    const hash = await hashPassword('secret123')
    const parts = hash.split('$')
    parts[3] = '00'.repeat(32) // wrong key
    const ok = await verifyPassword('secret123', parts.join('$'))
    expect(ok).toBe(false)
  })
})
