import { SignJWT } from 'jose'

interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

export async function getLineProfile(accessToken: string): Promise<LineProfile> {
  const res = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูล LINE profile ได้')
  return res.json()
}

export async function exchangeLineCode(
  code: string,
  channelId: string,
  channelSecret: string,
  redirectUri: string,
) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: channelId,
    client_secret: channelSecret,
  })

  const res = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  if (!res.ok) throw new Error('การแลกเปลี่ยน LINE token ล้มเหลว')
  const data = await res.json() as { access_token: string; id_token?: string }
  return data
}

export async function createJwt(
  payload: { id: string; role: string; name: string },
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder()
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(encoder.encode(secret))
}
