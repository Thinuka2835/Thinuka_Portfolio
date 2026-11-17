// Error types the API turns into consistent JSON responses.

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

/** A required integration or environment variable is missing. → 503 */
export class ConfigError extends HttpError {
  constructor(message) {
    super(503, 'not_configured', message)
  }
}

export const badRequest = (message, details) => new HttpError(400, 'bad_request', message, details)
export const unauthorized = (message = 'Please sign in.') => new HttpError(401, 'unauthenticated', message)
export const forbidden = (message = 'Not allowed.') => new HttpError(403, 'forbidden', message)
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message)
export const conflict = (message, details) => new HttpError(409, 'conflict', message, details)
export const tooManyRequests = (message, retryAfter) => new HttpError(429, 'rate_limited', message, { retryAfter })
