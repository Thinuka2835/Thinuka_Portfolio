#!/usr/bin/env node
// Administrator management. This CLI is the ONLY way to create an admin —
// the website has no registration endpoint.
//
//   npm run admin -- create --email you@example.com [--name "Your Name"]
//   npm run admin -- set-password --email you@example.com
//   npm run admin -- disable --email you@example.com      (also signs them out)
//   npm run admin -- enable --email you@example.com
//   npm run admin -- revoke-sessions --email you@example.com
//   npm run admin -- list
//
// The password is prompted for (hidden). For non-interactive use set ADMIN_PASSWORD.
import { createInterface } from 'node:readline'
import { query, resetDb } from '../server/db/client.js'
import { checkPasswordStrength, hashPassword } from '../server/auth/password.js'

const [command, ...rest] = process.argv.slice(2)
const flag = (name) => {
  const i = rest.indexOf(`--${name}`)
  return i >= 0 ? rest[i + 1] : undefined
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => {
      if (s.includes(question)) rl.output.write(s)
      else rl.output.write('*'.repeat(s.length ? 1 : 0))
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
  })
}

async function readNewPassword(email) {
  let password = process.env.ADMIN_PASSWORD
  if (!password) {
    if (!process.stdin.isTTY) throw new Error('No TTY: set ADMIN_PASSWORD to provide the password.')
    password = await promptHidden('New password: ')
    const again = await promptHidden('Repeat password: ')
    if (password !== again) throw new Error('Passwords do not match.')
  }
  const weak = checkPasswordStrength(password, email)
  if (weak) throw new Error(weak)
  return password
}

function requireEmail() {
  const email = (flag('email') || '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Pass a valid --email.')
  return email
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.')
  switch (command) {
    case 'create': {
      const email = requireEmail()
      const [exists] = await query(`select id from admin_users where email = $1`, [email])
      if (exists) throw new Error(`An admin with email ${email} already exists. Use set-password instead.`)
      const hash = await hashPassword(await readNewPassword(email))
      await query(`insert into admin_users (email, name, password_hash) values ($1, $2, $3)`, [email, flag('name') || '', hash])
      return `Created administrator ${email}.`
    }
    case 'set-password': {
      const email = requireEmail()
      const hash = await hashPassword(await readNewPassword(email))
      const rows = await query(
        `update admin_users set password_hash = $1, password_changed_at = now(), updated_at = now() where email = $2 returning id`,
        [hash, email]
      )
      if (!rows.length) throw new Error(`No admin with email ${email}.`)
      await query(`delete from admin_sessions where user_id = $1`, [rows[0].id])
      return `Password updated for ${email}; existing sessions were signed out.`
    }
    case 'disable':
    case 'enable': {
      const email = requireEmail()
      const rows = await query(`update admin_users set disabled = $1, updated_at = now() where email = $2 returning id`, [
        command === 'disable',
        email,
      ])
      if (!rows.length) throw new Error(`No admin with email ${email}.`)
      if (command === 'disable') await query(`delete from admin_sessions where user_id = $1`, [rows[0].id])
      return `${email} ${command}d.`
    }
    case 'revoke-sessions': {
      const email = requireEmail()
      const rows = await query(
        `delete from admin_sessions where user_id = (select id from admin_users where email = $1) returning id`,
        [email]
      )
      return `Revoked ${rows.length} session(s) for ${email}.`
    }
    case 'list': {
      const rows = await query(`select email, name, disabled, last_login_at from admin_users order by created_at`)
      if (!rows.length) return 'No administrators yet. Create one with: npm run admin -- create --email you@example.com'
      return rows
        .map((r) => `${r.disabled ? '✗' : '✓'} ${r.email}${r.name ? ` (${r.name})` : ''} — last login: ${r.last_login_at ? new Date(r.last_login_at).toISOString() : 'never'}`)
        .join('\n')
    }
    default:
      return 'Usage: npm run admin -- <create|set-password|disable|enable|revoke-sessions|list> [--email you@example.com] [--name "Name"]'
  }
}

try {
  console.log(await main())
} catch (err) {
  console.error(`Error: ${err.message}`)
  process.exitCode = 1
} finally {
  await resetDb()
}
