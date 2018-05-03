const JSZip = require('jszip')
const {saveAs} = require('file-saver')

module.exports = downloadZip

function downloadZip (archive) {
  const keyHex = archive.key.toString('hex')
  const storage = archive.db._storage
  const request = window.indexedDB.open('doc-' + keyHex)
  request.onerror = function (event) {
    console.log('IndexedDB error')
  }
  request.onsuccess = function (event) {
    const db = event.target.result
    const objectStore = db.transaction('data').objectStore('data')
    const files = []
    objectStore.openCursor().onsuccess = function (event) {
      const cursor = event.target.result
      if (cursor) {
        const match = cursor.key.match(/^(.*)\0length$/)
        if (match) {
          const filename = match[1]
          const length = cursor.value
          console.log('zipping', filename, length)
          files.push({filename, length})
        }
        cursor.continue()
      } else {
        zipUpFiles(keyHex, storage, files)
      }
    }
  }
}

function zipUpFiles (keyHex, storage, files) {
  const zip = new JSZip()
  addFilesToZip(() => {
    zip.generateAsync({type: 'blob'}).then(blob => {
      saveAs(blob, `hyperdrive-${keyHex}.zip`)
    })
  })

  function addFilesToZip (cb) {
    if (files.length === 0) return cb()
    const {filename, length} = files.shift()
    setTimeout(() => {
      const file = storage(filename)
      file.read(0, length, (err, buf) => {
        if (err) throw err
        zip.file(filename, buf)
        addFilesToZip(cb)
      })
    }, 0)
  }
}
