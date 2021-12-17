const expressWebSocket = require('express-ws')
const websocketStream = require('websocket-stream/stream')
const ram = require('random-access-memory')
const hyperdrive = require('@jimpick/hyperdrive-next')
const hyperdiscovery = require('hyperdiscovery')
const pump = require('pump')
const dumpWriters = require('../lib/dumpWriters')

module.exports = dbGateway

const maxArchives = 100
const archives = {}

setInterval(function cleanup () {
  const sortedArchives = Object.values(archives).sort((a, b) => a.lastAccess - b.lastAccess)
  console.log('Oldest to newest gatewayed archives:')
  sortedArchives.forEach((entry, index) => {
    const {archive, lastAccess, clients} = entry
    const key = archive.key && archive.key.toString('hex')
    const peers = archive.db.source.peers.length
    console.log(`  ${index} ${lastAccess} ${key} (${clients} clients, ${peers} peers)`)
  })
  if (sortedArchives.length > maxArchives) {
    for (let i = 0; i < sortedArchives.length - maxArchives; i++) {
      const archive = sortedArchives[i].archive
      const key = archive.key && archive.key.toString('hex')
      console.log(`Releasing ${i} ${key}`)
      sortedArchives[i].cancel()
    }
  }
}, 60 * 1000)

function dbGateway (router) {
  return function attachWebsocket (server) {
    console.log('Attaching websocket')
    expressWebSocket(router, server, {
      perMessageDeflate: false
    })

    router.ws('/archive/:key', (ws, req) => {
      const archiveKey = req.params.key
      console.log('Websocket initiated for', archiveKey)
      let archive
      if (archives[archiveKey]) {
        archive = archives[archiveKey].archive
        archives[archiveKey].lastAccess = Date.now()
      } else {
        archive = hyperdrive(ram, archiveKey)
        archives[archiveKey] = {
          archive,
          lastAccess: Date.now(),
          cancel,
          clients: 0
        }
        archive.on('ready', () => {
          console.log('archive ready')
          // Join swarm
          const sw = hyperdiscovery(archive)
          archives[archiveKey].swarm = sw
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
        archives[archiveKey].clients += 1
        const stream = websocketStream(ws)
        pump(
          stream,
          archive.replicate({encrypt: false, live: true}),
          stream,
          err => {
            console.log('pipe finished for ' + archiveKey, err && err.message)
            archives[archiveKey].clients -= 1
          }
        )
      })

      function cancel () {
        console.log(`Cancelling ${archiveKey}`)
        const sw = archives[archiveKey].swarm
        if (sw) sw.close()
        archive.db.source.peers.forEach(peer => peer.end())
        delete archives[archiveKey]
      }
    })
  }
}
