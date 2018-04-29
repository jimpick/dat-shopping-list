const websocket = require('websocket-stream')
const pump = require('pump')
const equal = require('deep-equal')
const dumpWriters = require('./dumpWriters')

module.exports = connectToGateway

let replicationCount = 0

function connectToGateway(archive) {
  const key = archive.key.toString('hex')
  const host = document.location.host
  const proto = document.location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${proto}://${host}/archive/${key}`
  console.log('connectToGateway', key)
  
  const intervalId = setInterval(dumpWritersIfChanged, 1000)

  let cancelled = false
  
  let archiveStream
  function connectWebsocket () {
    if (cancelled) return
    if (navigator.online === false) {
      console.log('Offline, not syncing')
      console.log('Waiting 5 seconds to reconnect')
      setTimeout(connectWebsocket, 5000)
      return
    }
    console.log('Connecting websocket', url)
    console.log('Active replications', ++replicationCount)
    const stream = websocket(url)
    archiveStream = archive.replicate({encrypt: false, live: true})
    pump(
      stream,
      archiveStream,
      stream,
      err => {
        if (err) {
          console.log('Pipe finished', err.message)
          if (err.stack) {
            console.log(err.stack)
          }
        } else {
          console.log('Pipe finished, no errors')
        }
        console.log('Active replications', --replicationCount)
        if (!cancelled) {
          console.log('Waiting 5 seconds to reconnect')
          setTimeout(connectWebsocket, 5000)
        } else {
          dumpWritersIfChanged()
          clearInterval(intervalId)
        }
      }
    )
  }
  connectWebsocket()
  
  let lastUpdate
  
  function dumpWritersIfChanged () {
    const db = archive.db
    const update = {
      connectedPeers: db.source.peers.filter(peer => !!peer.remoteId).length,
      writers: db._writers.map(
        writer => writer && [writer._feed.length, writer._feed.remoteLength]
      ),
      contentFeeds: db.contentFeeds.map(
        feed => feed && [feed.length, feed.remoteLength]
      )
    }
    if (!equal(update, lastUpdate)) {
      dumpWriters(archive)
      lastUpdate = update
    }
  }
  
  function cancel () {
    cancelled = true
    console.log('Ending replication on websocket')
    archiveStream.finalize() // Gracefully end the stream
  }
  
  return cancel
}
