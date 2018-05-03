const prettyHash = require('pretty-hash')

module.exports = dumpWriters

function dumpWriters (archive) {
  const db = archive.db
  console.log(
    'Connected Peers:',
    db.source.peers.filter(peer => !!peer.remoteId).length
  )
  console.log('Writers:')
  db._writers.forEach(writer => {
    console.log(
      `  ${writer._id} ${writer._feed.key.toString('hex')} ` +
      `dk: ${prettyHash(writer._feed.discoveryKey)} ` +
      `${writer._feed.length} R${writer._feed.remoteLength} `
    )
  })
  console.log('Content feeds:')
  db.contentFeeds.forEach((feed, index) => {
    if (feed) {
      console.log(
        `  ${index} ${feed.key.toString('hex')} ` +
        `dk: ${prettyHash(feed.discoveryKey)} ` +
        `${feed.length} R${feed.remoteLength} `
      )
    } else {
      console.log('  ', index, 'No feed')
    }
  })
}
