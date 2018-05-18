const workboxBuild = require('workbox-build')

module.exports = makeServiceWorker

function makeServiceWorker (cb) {
  console.log('Making service worker')
  workboxBuild
    .generateSW({
      swDest: '.data/sw.js',
      importWorkboxFrom: 'local',
      skipWaiting: true,
      clientsClaim: true,
      navigateFallback: '/',
      navigateFallbackWhitelist: [/^\/doc/, /^\/create/, /^\/add-link/],
      globDirectory: '.',
      globPatterns: ['index.html', 'static/manifest.webmanifest', 'static/**/*.svg', '.data/**/*.png'],
      modifyUrlPrefix: {
        'static': '',
        '.data': ''
      },
      templatedUrls: {
        '/': [ 'views/main.js' ]
      },
      runtimeCaching: [
        {
          urlPattern: /\/index.js$/,
          handler: 'staleWhileRevalidate'
        },
        {
          urlPattern: new RegExp('^https://cdn.glitch.com/'),
          handler: 'staleWhileRevalidate'
        },
        {
          urlPattern: new RegExp('^https://buttons.github.io/'),
          handler: 'staleWhileRevalidate'
        },
        {
          urlPattern: new RegExp('^https://api.github.com/'),
          handler: 'staleWhileRevalidate'
        }
      ]
    })
    .then(() => cb())
    .catch(cb)
}
