const websocket = require('websocket-stream')
const pump = require('pump')
const equal = require('deep-equal')
const dumpWriters = require('./dumpWriters')

module.exports = connectToGateway

let replicationCount = 0
let connecting = 0

function connectToGateway (archive, updateSyncStatus, updateConnecting) {
  const key = archive.key.toString('hex')
  const host = document.location.host
  const proto = document.location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${proto}://${host}/archive/${key}`
  console.log('connectToGateway', key)

  let cancelled = false
  let connected = false

  const intervalId = setInterval(dumpWritersIfChanged, 1000)

  let archiveStream
  function connectWebsocket () {
    if (cancelled) return
    if (connected) return
    if (navigator.onLine === false) {
      console.log('Offline, not syncing')
      console.log('Waiting 5 seconds to reconnect')
      setTimeout(connectWebsocket, 5000)
      return
    }
    console.log('Connecting websocket', url)
    console.log('Active replications', ++replicationCount)
    const stream = websocket(url)
    archiveStream = archive.replicate({encrypt: false, live: true})
    updateConnecting(++connecting)
    connected = true
    window.addEventListener('offline', goOfflineNow)
    window.removeEventListener('online', goOnlineNow)
    pump(
      stream,
      archiveStream,
      stream,
      err => {
        connected = false
        updateConnecting(--connecting)
        if (err) {
          console.log('Pipe finished', err.message)
          if (err.stack) {
            console.log(err.stack)
          }
        } else {
          console.log('Pipe finished, no errors')
        }
        console.log('Active replications', --replicationCount)
        window.removeEventListener('offline', goOfflineNow)
        if (!cancelled) {
          console.log('Waiting 5 seconds to reconnect')
          setTimeout(connectWebsocket, 5000)
          window.addEventListener('online', goOnlineNow)
        } else {
          dumpWritersIfChanged()
          clearInterval(intervalId)
        }
      }
    )

    function goOfflineNow () {
      if (connected && !archiveStream.destroyed) {
        console.log('Browser went offline - Ending replication on websocket')
        archiveStream.finalize() // Gracefully end the stream
      }
    }

    function goOnlineNow () {
      if (!connected && archiveStream.destroyed) {
        console.log('Browser went online - Restarting replication on websocket')
        connectWebsocket()
      }
    }
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
    const {connectedPeers} = update
    const syncStatus = update.writers.reduce(
      (acc, pair, index) => {
        const newAcc = Object.assign({}, acc)
        const contentPair = update.contentFeeds[index]
        if (index === db._localWriter._id) {
          if (pair) {
            newAcc.localUploadLength += pair[0]
            newAcc.remoteUploadLength += pair[1]
          }
          if (contentPair) {
            newAcc.localUploadLength += contentPair[0]
            newAcc.remoteUploadLength += contentPair[1]
          }
        } else {
          if (pair) {
            newAcc.localDownloadLength += pair[0]
            newAcc.remoteDownloadLength += pair[1]
          }
          if (contentPair) {
            newAcc.localDownloadLength += contentPair[0]
            newAcc.remoteDownloadLength += contentPair[1]
          }
        }
        return newAcc
      },
      {
        key,
        connectedPeers,
        localUploadLength: 0,
        remoteUploadLength: 0,
        localDownloadLength: 0,
        remoteDownloadLength: 0
      }
    )
    updateSyncStatus(syncStatus)
  }

  function cancel () {
    cancelled = true
    console.log('Ending replication on websocket')
    if (!connected || !archiveStream) {
      clearInterval(intervalId)
    }
    if (archiveStream) {
      archiveStream.finalize() // Gracefully end the stream
    }
  }

  return cancel
}
