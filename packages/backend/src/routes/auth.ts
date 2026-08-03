import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { SignJWT } from 'jose'
import { eq } from 'drizzle-orm'
import { createDb } from '../db'
import { teamMembers, sessions } from '../db/schema'
import { exchangeLineCode, getLineProfile } from '../services/line-auth'
import { hashPassword, verifyPassword } from '../services/password'
import { authMiddleware } from '../middleware/auth'
import { loginSchema, registerSchema } from '@sala-corporate/shared'
import type { DbClient } from '../db'

type Env = {
  DB: D1Database | DbClient
  JWT_SECRET: string
  LINE_CHANNEL_ID: string
  LINE_CHANNEL_SECRET: string
  INVITE_CODE: string
}

function resolveDb(env: Env): DbClient {
  const db = env.DB
  // In tests, DB may already be a drizzle instance
  if (db && typeof db === 'object' && 'insert' in db) {
    return db as unknown as DbClient
  }
  return createDb(db as D1Database)
}

async function issueSession(
  db: DbClient,
  memberId: string,
  memberRole: string,
  memberName: string,
  jwtSecret: string,
) {
  const encoder = new TextEncoder()
  const secretKey = jwtSecret || 'sala-corporate-secret-jwt-key-2026-secure'
  const token = await new SignJWT({
    id: memberId,
    role: memberRole,
    name: memberName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(encoder.encode(secretKey))

  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    teamMemberId: memberId,
    token,
    expiresAt,
  }).run()

  return token
}

export const authRoutes = new Hono<{ Bindings: Env }>()

// POST /api/auth/register — self-register with invite code
authRoutes.post('/register', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'ข้อมูลไม่ถูกต้อง' }, 400)
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const { name, email, password, inviteCode } = parsed.data

  const inviteCodeExpected = c.env.INVITE_CODE || 'SALA2026'
  if (inviteCode !== inviteCodeExpected) {
    return c.json({ success: false, error: 'รหัสเชิญไม่ถูกต้อง' }, 403)
  }

  const db = resolveDb(c.env)
  const normalizedEmail = email.toLowerCase()

  // Check email not already used
  const existing = await db.select().from(teamMembers)
    .where(eq(teamMembers.email, normalizedEmail))
    .limit(1)
    .all()
  if (existing.length > 0) {
    return c.json({ success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว' }, 409)
  }

  const passwordHash = await hashPassword(password)
  const memberId = crypto.randomUUID()

  await db.insert(teamMembers).values({
    id: memberId,
    lineUserId: `email_${memberId}`,
    name,
    email: normalizedEmail,
    passwordHash,
    role: 'sales_rep',
    isActive: true,
  }).run()

  const token = await issueSession(db, memberId, 'sales_rep', name, c.env.JWT_SECRET || 'sala-corporate-secret-jwt-key-2026-secure')

  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 3600,
  })

  return c.json({ success: true, data: { id: memberId, name, role: 'sales_rep' } }, 201)
})

// POST /api/auth/login — email + password
authRoutes.post('/login', async (c) => {
  try {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ success: false, error: 'ข้อมูลไม่ถูกต้อง' }, 400)
    }

    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
    }

    const { email, password } = parsed.data
    const db = resolveDb(c.env)
    const normalizedEmail = email.toLowerCase()

    const rows = await db.select().from(teamMembers)
      .where(eq(teamMembers.email, normalizedEmail))
      .limit(1)
      .all()
    const member = rows[0]

    if (!member || !member.passwordHash) {
      return c.json({ success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, 401)
    }

    const valid = await verifyPassword(password, member.passwordHash)
    if (!valid) {
      return c.json({ success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, 401)
    }

    if (!member.isActive) {
      return c.json({ success: false, error: 'บัญชีถูกระงับการใช้งาน' }, 403)
    }

    const token = await issueSession(db, member.id, member.role, member.name, c.env.JWT_SECRET || 'sala-corporate-secret-jwt-key-2026-secure')

    setCookie(c, 'token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 3600,
    })

    return c.json({ success: true, data: { id: member.id, name: member.name, role: member.role } })
  } catch (err) {
    const errorDetails = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    return c.json({ success: false, error: errorDetails }, 500)
  }
})

// GET /api/auth/line — initiate LINE login
authRoutes.get('/line', (c) => {
  const channelId = c.env.LINE_CHANNEL_ID
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/line/callback`
  const state = crypto.randomUUID()

  setCookie(c, 'line_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 600, // 10 minutes
  })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: 'profile',
  })
  const url = `https://access.line.me/oauth2/v2.1/authorize?${params}`

  return c.redirect(url)
})

// GET /api/auth/line/callback — handle LINE callback
authRoutes.get('/line/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')

  if (!code) {
    return c.json({ success: false, error: 'Missing authorization code' }, 400)
  }

  const cookieState = getCookie(c, 'line_state')
  if (!cookieState) {
    return c.json({ success: false, error: 'Missing CSRF state cookie' }, 400)
  }

  if (state !== cookieState) {
    return c.json({ success: false, error: 'CSRF state mismatch' }, 403)
  }

  // Clear the CSRF cookie
  deleteCookie(c, 'line_state', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
  })

  const channelId = c.env.LINE_CHANNEL_ID
  const channelSecret = c.env.LINE_CHANNEL_SECRET
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/line/callback`

  // Exchange code for tokens
  let tokenData: { access_token: string; id_token?: string }
  try {
    tokenData = await exchangeLineCode(code, channelId, channelSecret, redirectUri)
  } catch {
    return c.json({ success: false, error: 'LINE token exchange failed' }, 401)
  }

  // Get LINE profile
  let profile: { userId: string; displayName: string; pictureUrl?: string }
  try {
    profile = await getLineProfile(tokenData.access_token)
  } catch {
    return c.json({ success: false, error: 'Failed to fetch LINE profile' }, 401)
  }

  const db = resolveDb(c.env)

  // Find existing team member or auto-register
  const rows = await db.select().from(teamMembers)
    .where(eq(teamMembers.lineUserId, profile.userId))
    .limit(1)
    .all()
  const existing = rows[0]

  let memberId: string
  let memberRole: string
  let memberName: string

  if (existing) {
    memberId = existing.id
    memberRole = existing.role
    memberName = existing.name
  } else {
    // Auto-register as sales_rep
    memberId = crypto.randomUUID()
    memberRole = 'sales_rep'
    memberName = profile.displayName

    await db.insert(teamMembers).values({
      id: memberId,
      lineUserId: profile.userId,
      name: profile.displayName,
      role: 'sales_rep',
      avatarUrl: profile.pictureUrl ?? null,
      isActive: true,
    }).run()
  }

  // Create JWT
  const encoder = new TextEncoder()
  const token = await new SignJWT({
    id: memberId,
    role: memberRole,
    name: memberName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(encoder.encode(c.env.JWT_SECRET))

  // Store session
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    teamMemberId: memberId,
    token,
    expiresAt,
  }).run()

  // Set auth cookie
  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 3600, // 1 hour
  })

  return c.redirect('/')
})

// GET /api/auth/me — return current user profile
authRoutes.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')
  try {
    const db = resolveDb(c.env)
    const rows = await db.select().from(teamMembers).where(eq(teamMembers.id, user.id)).limit(1).all()
    const member = rows[0]
    if (member) {
      const { passwordHash, ...safeMember } = member
      return c.json({ success: true, data: safeMember })
    }
  } catch {
    // Fall back to JWT user payload if DB lookup is unavailable or in test mocks
  }
  return c.json({ success: true, data: user })
})

// POST /api/auth/change-password — update password
authRoutes.post('/change-password', authMiddleware, async (c) => {
  const user = c.get('user')
  let body: { currentPassword?: string; newPassword?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'ข้อมูลไม่ถูกต้อง' }, 400)
  }

  const { currentPassword, newPassword } = body
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return c.json({ success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' }, 400)
  }

  const db = resolveDb(c.env)
  const rows = await db.select().from(teamMembers).where(eq(teamMembers.id, user.id)).limit(1).all()
  const member = rows[0]

  if (!member || !member.passwordHash) {
    return c.json({ success: false, error: 'ไม่พบบัญชีผู้ใช้' }, 404)
  }

  const valid = await verifyPassword(currentPassword, member.passwordHash)
  if (!valid) {
    return c.json({ success: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, 400)
  }

  const newHash = await hashPassword(newPassword)
  await db.update(teamMembers)
    .set({ passwordHash: newHash, updatedAt: new Date().toISOString() })
    .where(eq(teamMembers.id, user.id))
    .run()

  return c.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' })
})

// POST /api/auth/logout — clear session
authRoutes.post('/logout', (c) => {
  deleteCookie(c, 'token', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
  })
  return c.json({ success: true })
})
