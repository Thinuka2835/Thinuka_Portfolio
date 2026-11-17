// Login throttling backed by the database (works across serverless instances).
import { query } from '../db/client.js'
import { tooManyRequests } from '../errors.js'

const WINDOW_MINUTES = 15
const MAX_FAILURES_PER_EMAIL = 5
const MAX_FAILURES_PER_IP = 20

export async function assertLoginAllowed(email, ip) {
  const [row] = await query(
    `select
       count(*) filter (where email = $1) as by_email,
       count(*) filter (where ip = $2)    as by_ip
     from login_attempts
     where success = false and created_at > now() - make_interval(mins => $3)`,
    [email, ip, WINDOW_MINUTES]
  )
  if (Number(row.by_email) >= MAX_FAILURES_PER_EMAIL || Number(row.by_ip) >= MAX_FAILURES_PER_IP) {
    throw tooManyRequests(`Too many failed sign-in attempts. Try again in ${WINDOW_MINUTES} minutes.`, WINDOW_MINUTES * 60)
  }
}

export async function recordLoginAttempt(email, ip, success) {
  await query(`insert into login_attempts (email, ip, success) values ($1, $2, $3)`, [email, ip, success])
  if (success) {
    // A successful sign-in clears that account's failure count
    await query(`delete from login_attempts where email = $1 and success = false`, [email])
  }
  await query(`delete from login_attempts where created_at < now() - interval '1 day'`)
}
