import { badRequest } from '../errors.js'

/** Parse a request body with a zod schema, or throw a 400 with per-field messages. */
export function parse(schema, data) {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  const fields = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_'
    fields[key] ??= issue.message
  }
  throw badRequest('Please fix the highlighted fields.', { fields })
}

export async function readJson(c) {
  try {
    return await c.req.json()
  } catch {
    throw badRequest('Request body must be valid JSON.')
  }
}

export const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())

/** Postgres error codes we turn into friendly responses. */
export const PG = { FOREIGN_KEY: '23503', UNIQUE: '23505' }
export const pgCode = (err) => err?.code || err?.cause?.code
