// Server-side sessions. The browser holds a random 256-bit token in an
// HttpOnly cookie; the database stores only its SHA-256 hash, so a leaked
// database row can't be turned back into a working cookie.
import { createHash, randomBytes } from 'node:crypto'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { query } from '../db/client.js'
import { sessionConfig } from '../config.js'

const hashToken = (token) => createHash('sha256').update(token).digest('hex')

const isSecureRequest = (c) => {
  const proto = c.req.header('x-forwarded-proto') || new URL(c.req.url).protocol.replace(':', '')
  return proto === 'https'
}

// `__Host-` cookies must be Secure, host-only and Path=/ — the browser enforces it.
export const cookieName = (c) => (isSecureRequest(c) ? '__Host-admin_session' : 'admin_session')

export const clientIp = (c) =>
  (c.req.header('x-forwarded-for') || '').split(',')[0].trim() || c.req.header('x-real-ip') || 'unknown'

export async function createSession(c, userId) {
  const { ttlHours } = sessionConfig()
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000)
  await query(
    `insert into admin_sessions (id, user_id, expires_at, ip, user_agent) values ($1, $2, $3, $4, $5)`,
    [hashToken(token), userId, expiresAt.toISOString(), clientIp(c), (c.req.header('user-agent') || '').slice(0, 300)]
  )
  setCookie(c, cookieName(c), token, {
    httpOnly: true,
    secure: isSecureRequest(c),
    sameSite: 'Strict',
    path: '/',
    expires: expiresAt,
  })
  // Opportunistic cleanup of long-expired sessions
  await query(`delete from admin_sessions where expires_at < now() - interval '1 day'`)
  return { expiresAt }
}

/** Returns { session, user } for a valid, unexpired, non-idle session — or null. */
export async function readSession(c) {
  const token = getCookie(c, cookieName(c))
  if (!token || token.length > 100) return null
  const { idleMinutes } = sessionConfig()
  const rows = await query(
    `select s.id, s.expires_at, s.last_seen_at, u.id as user_id, u.email, u.name
       from admin_sessions s
       join admin_users u on u.id = s.user_id
      where s.id = $1
        and s.expires_at > now()
        and s.last_seen_at > now() - make_interval(mins => $2)
        and u.disabled = false`,
    [hashToken(token), idleMinutes]
  )
  const row = rows[0]
  if (!row) return null

  // Sliding idle timeout: refresh last_seen at most once a minute
  if (Date.now() - new Date(row.last_seen_at).getTime() > 60_000) {
    await query(`update admin_sessions set last_seen_at = now() where id = $1`, [row.id])
    row.last_seen_at = new Date().toISOString()
  }
  return {
    session: {
      id: row.id,
      expiresAt: new Date(row.expires_at).toISOString(),
      idleExpiresAt: new Date(new Date(row.last_seen_at).getTime() + idleMinutes * 60_000).toISOString(),
    },
    user: { id: row.user_id, email: row.email, name: row.name },
  }
}

export async function destroySession(c) {
  const token = getCookie(c, cookieName(c))
  if (token) await query(`delete from admin_sessions where id = $1`, [hashToken(token)])
  deleteCookie(c, cookieName(c), { path: '/', secure: isSecureRequest(c) })
}

export async function destroyOtherSessions(userId, keepSessionId) {
  await query(`delete from admin_sessions where user_id = $1 and id <> $2`, [userId, keepSessionId])
}
