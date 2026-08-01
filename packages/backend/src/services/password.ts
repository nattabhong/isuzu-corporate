// Password hashing using PBKDF2 (Web Crypto API — works on Cloudflare Workers)
// Format: pbkdf2$<iterations>$<saltHex>$<hashHex>

const ITERATIONS = 100_000
const KEY_LENGTH_BYTES = 32
const SALT_BYTES = 16

const enc = new TextEncoder()

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH_BYTES * 8,
  )
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const key = await deriveKey(password, salt, ITERATIONS)
  const keyBytes = new Uint8Array(key)
  return `pbkdf2$${ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(keyBytes)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false

  const iterations = parseInt(parts[1], 10)
  const salt = hexToBytes(parts[2])
  const expected = hexToBytes(parts[3])

  if (!Number.isFinite(iterations) || iterations < 1) return false

  const key = await deriveKey(password, salt, iterations)
  const keyBytes = new Uint8Array(key)
  return timingSafeEqual(keyBytes, expected)
}
