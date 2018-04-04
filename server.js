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
        archive.replicate({encrypt: false}),
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

const port = process.env.PORT || 5000
const devServer = budo('index.js', {
  port,
  browserify: {
    transform: [ brfs, sheetify ]
  },
  middleware: [
    router
  ]
})
devServer.on('connect', event => {
  console.log('Listening on', event.uri)
  attachWebsocket(event.server)
})
