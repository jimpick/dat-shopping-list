const websocket = require('websocket-stream')
const pump = require('pump')
const equal = require('deep-equal')
const dumpWriters = require('./dumpWriters')

module.exports = connectToGateway

let replicationCount = 0
let connecting = 0

function connectToGateway(archive, updateSyncStatus, updateConnecting) {
  const key = archive.key.toString('hex')
  const host = document.location.host
  const proto = document.location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${proto}://${host}/archive/${key}`
  console.log('connectToGateway', key)
  
  const intervalId = setInterval(dumpWritersIfChanged, 1000)

  let cancelled = false
  let connected = false
  
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
    let [localFeedLength, remoteFeedLength] =
      update.writers.reduce(
        (acc, pair) => pair ? [acc[0] + pair[0], acc[1] + pair[1]] : acc,
        update.contentFeeds.reduce(
          (acc, pair) => pair ? [acc[0] + pair[0], acc[1] + pair[1]] : acc,
          [0, 0]
        )
      )
    updateSyncStatus({key, connectedPeers, localFeedLength, remoteFeedLength})
  }
  
  function cancel () {
    cancelled = true
    console.log('Ending replication on websocket')
    archiveStream.finalize() // Gracefully end the stream
  }
  
  return cancel
}
