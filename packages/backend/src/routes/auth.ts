import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { SignJWT } from 'jose'
import { eq } from 'drizzle-orm'
import { createDb } from '../db'
import { teamMembers, sessions } from '../db/schema'
import { exchangeLineCode, getLineProfile } from '../services/line-auth'
import { authMiddleware } from '../middleware/auth'
import type { DbClient } from '../db'

type Env = {
  DB: D1Database | DbClient
  JWT_SECRET: string
  LINE_CHANNEL_ID: string
  LINE_CHANNEL_SECRET: string
}

function resolveDb(env: Env): DbClient {
  const db = env.DB
  // In tests, DB may already be a drizzle instance
  if (db && typeof db === 'object' && 'insert' in db) {
    return db as unknown as DbClient
  }
  return createDb(db as D1Database)
}

export const authRoutes = new Hono<{ Bindings: Env }>()

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

    db.insert(teamMembers).values({
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
  db.insert(sessions).values({
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

// GET /api/auth/me — return current user
const meApp = new Hono<{ Bindings: { JWT_SECRET: string }; Variables: { user: { id: string; role: string; name: string } } }>()
meApp.use('*', authMiddleware)
meApp.get('/', (c) => {
  const user = c.get('user')
  return c.json({ success: true, data: user })
})
authRoutes.route('/me', meApp)

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
