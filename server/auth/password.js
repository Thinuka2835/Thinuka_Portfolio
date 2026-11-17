// Password hashing with scrypt (Node built-in, memory-hard).
// Format: scrypt$N$r$p$saltB64$hashB64 — parameters are stored with the hash
// so they can be raised later without breaking existing passwords.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb)
const PARAMS = { N: 2 ** 15, r: 8, p: 1 }
const KEYLEN = 64
const maxmem = 128 * PARAMS.N * PARAMS.r * 2

export const MIN_PASSWORD_LENGTH = 12

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scrypt(password.normalize('NFKC'), salt, KEYLEN, { ...PARAMS, maxmem })
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), hash.toString('base64')].join('$')
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, N, r, p, saltB64, hashB64] = parts
  const expected = Buffer.from(hashB64, 'base64')
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: 128 * Number(N) * Number(r) * 2,
  })
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

// Used when the email doesn't exist, so response time doesn't reveal which emails are admins
let dummyHash
export async function burnPasswordCheck(password) {
  dummyHash ??= await hashPassword('dummy-password-for-timing')
  await verifyPassword(password, dummyHash)
}

/** Returns an error message, or null when the password is acceptable. */
export function checkPasswordStrength(password, email = '') {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (password.length > 256) return 'Use at most 256 characters.'
  if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
    return 'Don’t include your email name in the password.'
  }
  if (new Set(password).size < 5) return 'Use a less repetitive password.'
  return null
}
