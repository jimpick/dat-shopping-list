const budo = require('budo')
const express = require('express')
const expressWebSocket = require('express-ws')
const websocketStream = require('websocket-stream/stream')
const pump = require('pump')
const through2 = require('through2')
const ram = require('random-access-memory')
const hyperdrive = require('hyperdrive')
const hyperdiscovery = require('hyperdiscovery')
const sheetify = require('sheetify')
const brfs = require('brfs')
const prettyHash = require('pretty-hash')
const workboxBuild = require('workbox-build')

require('events').prototype._maxListeners = 100

const router = express.Router()

function serveIndex (req, res, next) {
  req.url = '/index.html'
  next()
}

router.get('/create', serveIndex)
router.get('/doc/:key', serveIndex)

const archives = {}

function attachWebsocket (server) {
  console.log('Attaching websocket')
  expressWebSocket(router, server, {
    perMessageDeflate: false
  })

  router.ws('/archive/:key', (ws, req) => {
    const archiveKey = req.params.key
    console.log('Websocket initiated for', archiveKey)
    let archive
    if (archives[archiveKey]) {
      archive = archives[archiveKey]
    } else {
      archive = hyperdrive(ram, archiveKey)
      archives[archiveKey] = archive
      archive.on('ready', () => {
        console.log('archive ready')
        // Join swarm
        const sw = hyperdiscovery(archive)
        sw.on('connection', (peer, info) => {
          console.log('Swarm connection', info)
        })
        archive.db.watch(() => {
          console.log('Archive updated:', archive.key.toString('hex'))
          console.log('Writers:')
          archive.db._writers.forEach(writer => {
          console.log('  ', writer._feed.key.toString('hex'), writer._feed.length)
        })

        })
      })
    }
    archive.ready(() => {
      const stream = websocketStream(ws)
      pump(
        stream,
        through2(function (chunk, enc, cb) {
          // console.log('From web', chunk)
          this.push(chunk)
          cb()
        }),
        archive.replicate({encrypt: false, live: true}),
        through2(function (chunk, enc, cb) {
          // console.log('To web', chunk)
          this.push(chunk)
          cb()
        }),
        stream,
        err => {
          console.log('pipe finished', err.message)
        }
      )
    })
  })
}

workboxBuild.generateSW({
  swDest: './generated/sw.js',
  importWorkboxFrom: 'local',
  navigateFallback: '/',
  navigateFallbackWhitelist: [/^\/doc/],
  globDirectory: '.',
  globPatterns: ['index.html', 'index.js', 'static\/**\/*.svg'],
  modifyUrlPrefix: {
    'static': ''
  },
  templatedUrls: {
    '/': [ 'views/main.js' ],
    '/create': [ 'views/create.js' ],
    '/doc': [ 'views/shoppingList.js' ]
  },
  runtimeCaching: [
    {
      urlPattern: /^favicon.ico/,
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
}).then(() => {
  const port = process.env.PORT || 5000
  const devServer = budo('index.js', {
    port,
    browserify: {
      transform: [
        brfs,
        [sheetify, {transform: ['sheetify-nested']}]
      ]
    },
    middleware: [
      express.static('img'),
      router
    ],
    dir: ['.', 'static', 'generated']
  })
  devServer.on('connect', event => {
    console.log('Listening on', event.uri)
    attachWebsocket(event.server)
  })
})


