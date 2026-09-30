// Small hand-rolled validators. Express 5 will forward rejected promises to the
// error handler, so routes can throw and let errorHandler decide the status.

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const badRequest = (message) => new HttpError(400, message)
const notFound = (message) => new HttpError(404, message)
const forbidden = (message) => new HttpError(403, message)
const conflict = (message) => new HttpError(409, message)

function requireString(value, field, { min = 1, max = 500 } = {}) {
  if (typeof value !== 'string') throw badRequest(`${field} is required`)
  const trimmed = value.trim()
  if (trimmed.length < min) {
    throw badRequest(min === 1 ? `${field} is required` : `${field} must be at least ${min} characters`)
  }
  if (trimmed.length > max) throw badRequest(`${field} must be at most ${max} characters`)
  return trimmed
}

function optionalString(value, field, { max = 500 } = {}) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw badRequest(`${field} must be text`)
  const trimmed = value.trim()
  if (trimmed.length > max) throw badRequest(`${field} must be at most ${max} characters`)
  return trimmed.length ? trimmed : null
}

function requireNumber(value, field, { min = -Infinity, max = Infinity } = {}) {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) throw badRequest(`${field} must be a number`)
  if (num < min) throw badRequest(`${field} must be at least ${min}`)
  if (num > max) throw badRequest(`${field} must be at most ${max}`)
  return num
}

function requireInt(value, field, { min = -Infinity, max = Infinity } = {}) {
  const num = requireNumber(value, field, { min, max })
  if (!Number.isInteger(num)) throw badRequest(`${field} must be a whole number`)
  return num
}

function requireOneOf(value, field, allowed) {
  const str = requireString(value, field)
  if (!allowed.includes(str)) {
    throw badRequest(`${field} must be one of: ${allowed.join(', ')}`)
  }
  return str
}

// Postgres uuid, checked before it reaches the driver. An invalid uuid makes
// PostgREST return a confusing error that reads like a server fault.
function requireUuid(value, field) {
  const str = requireString(value, field)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    throw badRequest(`${field} must be a valid id`)
  }
  return str.toLowerCase()
}

module.exports = {
  HttpError,
  badRequest,
  notFound,
  forbidden,
  conflict,
  requireString,
  optionalString,
  requireNumber,
  requireInt,
  requireOneOf,
  requireUuid
}
