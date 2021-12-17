const thunky = require('thunky')

module.exports = store

function store (state, emitter) {
  state.documents = []

  const ready = thunky(openDocumentsDB)

  ready(() => { emitter.emit('render') })

  emitter.on('writeNewDocumentRecord', (keyHex, docName) => {
    ready(() => {
      if (state.documents.find(doc => doc.key === keyHex)) return
      writeDocumentRecord(keyHex, docName, err => {
        if (err) throw err
        emitter.emit('pushState', `/doc/${keyHex}`)
      })
    })
  })

  emitter.on('deleteCurrentDoc', () => {
    const keyHex = state.params.key
    deleteDoc(keyHex, err => {
      if (err) throw err
      console.log('Doc deleted', keyHex)
      emitter.emit('pushState', '/')
    })
  })

  emitter.on('fetchDocLastSync', fetchDocLastSync)
  emitter.on('updateDocLastSync', updateDocLastSync)

  // Store documents in indexedDB
  function openDocumentsDB (cb) {
    const request = window.indexedDB.open('documents', 2)
    request.onerror = function (event) {
      console.log('IndexedDB error')
    }
    request.onsuccess = function (event) {
      state.documentsDB = event.target.result
      readDocuments(cb)
    }
    request.onupgradeneeded = function (event) {
      const db = event.target.result
      let objectStore
      if (event.oldVersion === 0) {
        objectStore = db.createObjectStore('documents', {keyPath: 'key'})
        objectStore.createIndex('name', 'name')
      } else {
        objectStore = event.target.transaction.objectStore('documents')
      }
      objectStore.createIndex('dateAdded', 'dateAdded')
      objectStore.transaction.oncomplete = function (event) {
        console.log('Document db created')
      }
    }
  }

  function readDocuments (cb) {
    const db = state.documentsDB
    if (!db) return
    const objectStore = db.transaction('documents').objectStore('documents')
    const index = objectStore.index('dateAdded')
    state.documents = []
    index.openCursor().onsuccess = function (event) {
      const cursor = event.target.result
      if (cursor) {
        state.documents.push(cursor.value)
        cursor.continue()
      } else {
        cb()
      }
    }
  }

  function writeDocumentRecord (key, name, cb) {
    const db = state.documentsDB
    if (!db) return
    const request = db.transaction('documents', 'readwrite')
      .objectStore('documents')
      .add({
        key,
        name,
        dateAdded: Date.now(),
        lastSync: null,
        syncedUploadLength: 0,
        syncedDownloadLength: 0
      })
    request.onsuccess = function (event) {
      readDocuments(() => {
        console.log('documents reloaded')
        cb()
      })
    }
    request.onerror = function (err) {
      cb(err)
    }
  }

  function deleteDoc (key, cb) {
    const db = state.documentsDB
    const request = db.transaction('documents', 'readwrite')
      .objectStore('documents')
      .delete(key)
    request.onsuccess = function (event) {
      // Note: Deleting db doesn't return success ... probably because it's
      // still in use? It appears that it still gets cleaned up.
      window.indexedDB.deleteDatabase(`doc-${key}`)
      readDocuments(() => {
        console.log('documents reloaded')
        cb()
      })
    }
    request.onerror = function (err) {
      cb(err)
    }
  }

  function fetchDocLastSync (key) {
    state.lastSync = null
    state.syncedUploadLength = null
    state.syncedDownloadLength = null
    state.localUploadLength = null
    state.localDownloadLength = null
    ready(() => {
      const db = state.documentsDB
      const objectStore = db.transaction('documents', 'readwrite')
        .objectStore('documents')
      const request = objectStore.get(key)
      request.onsuccess = function (event) {
        const data = event.target.result
        if (!data) return
        state.lastSync = data.lastSync
        state.syncedUploadLength = data.syncedUploadLength
        state.syncedDownloadLength = data.syncedDownloadLength
      }
      request.onerror = function (event) {
        console.error('fetchDocLastSync error', event)
      }
    })
  }

  function updateDocLastSync ({key, syncedUploadLength, syncedDownloadLength}) {
    ready(() => {
      const db = state.documentsDB
      const objectStore = db.transaction('documents', 'readwrite')
        .objectStore('documents')
      const request = objectStore.get(key)
      request.onsuccess = function (event) {
        const data = event.target.result
        if (!data) return
        data.syncedUploadLength = syncedUploadLength
        data.syncedDownloadLength = syncedDownloadLength
        data.lastSync = Date.now()
        const requestUpdate = objectStore.put(data)
        requestUpdate.onerror = function (event) {
          console.error('updateDocLastSync update error', event)
        }
      }
      request.onerror = function (event) {
        console.error('updateDocLastSync error', event)
      }
    })
  }
}
