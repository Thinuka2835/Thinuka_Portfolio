import { Hono } from 'hono'
import { query } from '../db/client.js'
import { unauthorized, badRequest } from '../errors.js'
import { burnPasswordCheck, checkPasswordStrength, hashPassword, verifyPassword } from '../auth/password.js'
import { clientIp, createSession, destroyOtherSessions, destroySession } from '../auth/sessions.js'
import { assertLoginAllowed, recordLoginAttempt } from '../auth/rateLimit.js'
import { requireAdmin } from '../auth/guards.js'
import { loginSchema, passwordChangeSchema } from '../validation.js'
import { parse, readJson } from './helpers.js'

// There is intentionally NO registration endpoint. Administrators are created
// from the command line (`npm run admin -- create`) by someone with database access.
export const authRoutes = new Hono()

const INVALID = 'Incorrect email or password.'

authRoutes.post('/login', async (c) => {
  const { email, password } = parse(loginSchema, await readJson(c))
  const ip = clientIp(c)
  await assertLoginAllowed(email, ip)

  const [user] = await query(`select id, email, name, password_hash, disabled from admin_users where email = $1`, [email])
  if (!user) {
    await burnPasswordCheck(password)
    await recordLoginAttempt(email, ip, false)
    throw unauthorized(INVALID)
  }
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok || user.disabled) {
    await recordLoginAttempt(email, ip, false)
    throw unauthorized(INVALID)
  }

  await recordLoginAttempt(email, ip, true)
  await query(`update admin_users set last_login_at = now() where id = $1`, [user.id])
  const { expiresAt } = await createSession(c, user.id)
  return c.json({ user: { id: user.id, email: user.email, name: user.name }, expiresAt: expiresAt.toISOString() })
})

authRoutes.post('/logout', async (c) => {
  await destroySession(c)
  return c.json({ ok: true })
})

authRoutes.get('/session', requireAdmin, (c) => c.json({ user: c.get('admin'), session: c.get('session') }))

authRoutes.post('/logout-all', requireAdmin, async (c) => {
  await query(`delete from admin_sessions where user_id = $1`, [c.get('admin').id])
  await destroySession(c)
  return c.json({ ok: true })
})

authRoutes.post('/password', requireAdmin, async (c) => {
  const { currentPassword, newPassword } = parse(passwordChangeSchema, await readJson(c))
  const admin = c.get('admin')
  const [user] = await query(`select password_hash from admin_users where id = $1`, [admin.id])
  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    throw badRequest('Please fix the highlighted fields.', { fields: { currentPassword: 'Current password is incorrect.' } })
  }
  const weak = checkPasswordStrength(newPassword, admin.email)
  if (weak) throw badRequest('Please fix the highlighted fields.', { fields: { newPassword: weak } })

  await query(`update admin_users set password_hash = $1, password_changed_at = now(), updated_at = now() where id = $2`, [
    await hashPassword(newPassword),
    admin.id,
  ])
  await destroyOtherSessions(admin.id, c.get('session').id)
  return c.json({ ok: true })
})
