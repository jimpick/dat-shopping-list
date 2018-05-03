const nocache = require('nocache')

module.exports = serviceWorkerNoCache

const nocacheMiddleware = nocache()

function serviceWorkerNoCache (req, res, next) {
  if (
    req.url === '/' ||
    req.url === '/sw.js' ||
    req.url === '/index.js'
  ) {
    return nocacheMiddleware(req, res, next)
  }
  next()
}
