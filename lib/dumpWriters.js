const prettyHash = require('pretty-hash')

module.exports = dumpWriters

function dumpWriters (archive) {
  console.log('Writers:')
  archive.db._writers.forEach(writer => {
    console.log(`  ${writer._feed.key.toString('hex')} dk: ` +
                `${prettyHash(writer._feed.discoveryKey)} ${writer._feed.length}`)
  })
  console.log('Content feeds:')
  archive.db.contentFeeds.forEach((feed, index) => {
    if (feed) {
      console.log('  ', index, feed.key.toString('hex'), feed.length)
    } else {
      console.log('  ', index, 'No feed')
    }
  })
}
