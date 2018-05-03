module.exports = redirectToHttps

function redirectToHttps (req, res, next) {
  // Glitch has a proxy
  const xfpHeader = req.headers['x-forwarded-proto']
  if (!xfpHeader.match(/^https/)) {
    const redirectUrl = 'https://' + req.headers['host'] + req.url
    res.writeHead(301, {Location: redirectUrl})
    res.end()
  } else {
    next()
  }
}
