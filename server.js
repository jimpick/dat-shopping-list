const budo = require('budo')
const express = require('express')
const compression = require('compression')
const expressWebSocket = require('express-ws')
const websocketStream = require('websocket-stream/stream')
const pump = require('pump')
const through2 = require('through2')
const ram = require('random-access-memory')
const hyperdrive = require('hyperdrive')
const hyperdiscovery = require('hyperdiscovery')
const sheetify = require('sheetify')
const brfs = require('brfs')
const workboxBuild = require('workbox-build')
const gm = require('gm').subClass({imageMagick: true})
const mkdirp = require('mkdirp')
const dumpWriters = require('./lib/dumpWriters')

require('events').prototype._maxListeners = 100

const router = express.Router()

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
        const watcher = archive.db.watch(() => {
          console.log('Archive updated:', archive.key.toString('hex'))
          dumpWriters(archive)
        })
        watcher.on('error', err => {
          console.error('Watcher error', err)
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

function makeServiceWorker () {
  const promise = workboxBuild.generateSW({
    swDest: './.data/sw.js',
    importWorkboxFrom: 'local',
    navigateFallback: '/',
    navigateFallbackWhitelist: [/^\/doc/],
    globDirectory: '.',
    globPatterns: ['index.html', 'index.js', 'static\/**\/*.svg', '.data\/**\/*.png'],
    modifyUrlPrefix: {
      'static': '',
      '.data': ''
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
  })
  return promise
}

function makePngFromSvg(name, size) {
  const promise = new Promise((resolve, reject) => {
    gm(`./static/img/${name}.svg`)
      .resize(size, size)
      .write(`./.data/img/${name}-${size}.png`, err => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
  })
  return promise
}

mkdirp.sync('./.data/img')

makeServiceWorker()
  .then(makePngFromSvg('dat-hexagon', 16))
  .then(makePngFromSvg('dat-hexagon', 32))
  .then(makePngFromSvg('dat-hexagon', 96))
  .then(makePngFromSvg('dat-hexagon', 120))
  .then(makePngFromSvg('dat-hexagon', 152))
  .then(makePngFromSvg('dat-hexagon', 167))
  .then(makePngFromSvg('dat-hexagon', 180))
  .then(makePngFromSvg('dat-hexagon', 192))
  .then(makePngFromSvg('dat-hexagon', 196))
  .then(makePngFromSvg('dat-hexagon', 512))
  .then(() => {
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
        compression(),
        redirectToHttps,
        express.static('img'),
        router
      ],
      dir: ['.', 'static', '.data']
    })
    devServer.on('connect', event => {
      console.log('Listening on', event.uri)
      attachWebsocket(event.server)
    })
  })
  .catch(err => {
    console.error('Exception', err)
  })

