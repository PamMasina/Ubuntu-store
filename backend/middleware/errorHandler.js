const { HttpError } = require('../utils/validate')

// Anything thrown inside a route lands here. Unknown paths are turned into JSON
// rather than Express's default HTML page, so clients only ever parse one shape.
function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` })
}

function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message })
  }

  // body-parser rejects malformed JSON with type 'entity.parse.failed' and
  // status 400. Honouring that keeps a syntax error from reading as a 500.
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' })
  }

  // Payload too large, and other body-parser rejections, carry a statusCode.
  if (err && typeof err.statusCode === 'number' && err.expose) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  // Postgres error codes we can map onto something the client can act on.
  if (err && typeof err.code === 'string') {
    switch (err.code) {
      // RAISE EXCEPTION from our own plpgsql functions: bad input, illegal
      // status transition, out of stock. The message is written by us, so it
      // is safe to pass through.
      case 'P0001':
        return res.status(400).json({ error: err.message })
      case 'P0002':
      case 'PGRST116':
        return res.status(404).json({ error: 'Not found' })
      case '23505':
        return res.status(409).json({ error: 'That already exists' })
      case '23503':
        return res.status(400).json({ error: 'Referenced record does not exist' })
      case '23514':
        return res.status(400).json({ error: 'That value is not allowed' })
      case '22P02':
        return res.status(400).json({ error: 'Malformed id' })
      case '28000':
        return res.status(401).json({ error: 'Not authenticated' })
      case '42501':
        return res.status(403).json({ error: 'Not permitted' })
    }
  }

  console.error('Unhandled error:', err)
  // Never echo a raw driver message to the client: it leaks table and column
  // names. Log it here, return something generic.
  res.status(500).json({ error: 'Internal server error' })
}

module.exports = { notFoundHandler, errorHandler }
