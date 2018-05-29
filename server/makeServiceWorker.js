const swPrecache = require('sw-precache')

module.exports = makeServiceWorker

function makeServiceWorker (cb) {
  console.log('Making service worker')
  swPrecache.write('.data/sw.js', {
    skipWaiting: true,
    clientsClaim: true,
    navigateFallback: '/',
    navigateFallbackWhitelist: [/^\/doc/, /^\/create/, /^\/add-link/],
    staticFileGlobs: ['index.html', 'static/manifest.webmanifest', 'static/**/*.svg', '.data/**/*.png'],
    stripPrefixMulti: {
      'static': '',
      '.data': ''
    },
    runtimeCaching: [
      {
        urlPattern: /\/index.js$/,
        handler: 'fastest'
      },
      {
        urlPattern: new RegExp('^https://cdn.glitch.com/'),
        handler: 'fastest'
      },
      {
        urlPattern: new RegExp('^https://buttons.github.io/'),
        handler: 'fastest'
      },
      {
        urlPattern: new RegExp('^https://api.github.com/'),
        handler: 'fastest'
      }
    ]    
  }, cb)
}
