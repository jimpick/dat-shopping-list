const rai = require('random-access-idb')
const toBuffer = require('to-buffer')
// const hyperdrive = require('hyperdrive')
const hyperdrive = require('@jimpick/hyperdrive-next')
const crypto = require('hypercore/lib/crypto')
const newId = require('monotonic-timestamp-base36')
const dumpWriters = require('../lib/dumpWriters')
const downloadZip = require('../lib/downloadZip')
const connectToGateway = require('../lib/websocketGateway')
const customAlert = require('../components/customAlert')

require('events').prototype._maxListeners = 100

module.exports = store

function store (state, emitter) {
  state.shoppingList = []
  state.localKeyCopied = false
  state.writeStatusCollapsed = window.localStorage.getItem(
    'writeStatusCollapsed'
  )

  emitter.on('DOMContentLoaded', updateDoc)
  emitter.on('navigate', updateDoc)

  emitter.on('addLink', link => {
    const match = link.match(/([0-9a-fA-F]{64})\/?$/)
    if (match) {
      const key = match[1]
      emitter.emit('pushState', `/doc/${key}`)
    } else {
      customAlert.show('URL or key must contain a 64 character hex value', () => {
        const textInput = document.querySelector('.content input[type="text"]')
        textInput.removeAttribute('disabled')
        const submitButton = document.querySelector('.content input[type="submit"]')
        submitButton.removeAttribute('disabled')
      })
    }
  })

  function updateDoc () {
    emitter.once('render', () => {
      document.body.scrollIntoView(true)
      // Do it again for mobile Safari
      setTimeout(() => document.body.scrollIntoView(true), 200)
    })
    state.error = null
    state.authorized = null
    state.shoppingList = []
    state.localKeyCopied = false
    state.docTitle = ''
    if (!state.params || !state.params.key) {
      state.archive = null
      state.key = null
      state.loading = false
      emitter.emit('render')
    } else {
      const keyHex = state.params.key
      console.log(`Loading ${keyHex}`)
      state.localFeedLength = null
      emitter.emit('fetchDocLastSync', keyHex)
      const storage = rai(`doc-${keyHex}`)
      const archive = hyperdrive(storage, keyHex)
      state.loading = true
      emitter.emit('render')
      archive.ready(() => {
        console.log('hyperdrive ready')
        console.log('Local key:', archive.db.local.key.toString('hex'))
        dumpWriters(archive)
        state.archive = archive
        state.key = archive.key
        if (state.cancelGatewayReplication) state.cancelGatewayReplication()
        state.cancelGatewayReplication = connectToGateway(
          archive, updateSyncStatus, updateConnecting
        )
        readShoppingList()
        archive.db.watch(() => {
          console.log('Archive updated:', archive.key.toString('hex'))
          dumpWriters(archive)
          readShoppingList()
        })
      })
    }
  }

  emitter.on('createDoc', docName => {
    const {publicKey: key, secretKey} = crypto.keyPair()
    const keyHex = key.toString('hex')
    console.log('Create doc:', docName, keyHex)
    const storage = rai(`doc-${keyHex}`)
    const archive = hyperdrive(storage, key, {secretKey})
    archive.ready(() => {
      console.log('hyperdrive ready')
      state.key = key
      state.archive = archive
      let shoppingList = ['Rice', 'Bananas', 'Kale', 'Avocados', 'Bread', 'Quinoa', 'Beer']
      writeDatJson(() => {
        writeShoppingListItems(() => {
          console.log('Done')
          emitter.emit('writeNewDocumentRecord', keyHex, docName)
        })
      })

      function writeDatJson (cb) {
        const json = JSON.stringify({
          url: `dat://${keyHex}/`,
          title: docName,
          description: `Dat Shopping List demo - https://${state.glitchAppName}.glitch.me/`
        }, null, 2)
        archive.writeFile('dat.json', json, err => {
          if (err) throw err
          cb()
        })
      }

      function writeShoppingListItems (cb) {
        const item = shoppingList.shift()
        if (!item) return cb()
        const json = JSON.stringify({
          name: item,
          bought: false,
          dateAdded: Date.now()
        })
        archive.writeFile(`/shopping-list/${newId()}.json`, json, err => {
          if (err) throw err
          writeShoppingListItems(cb)
        })
      }
    })
  })

  function updateSyncStatus (message) {
    const {
      key,
      connectedPeers,
      localUploadLength,
      remoteUploadLength,
      localDownloadLength,
      remoteDownloadLength
    } = message
    if (state.key && key !== state.key.toString('hex')) return
    state.connected = !!connectedPeers
    state.localUploadLength = state.loading ? null : localUploadLength
    state.localDownloadLength = state.loading ? null : localDownloadLength
    if (state.key && connectedPeers) {
      state.connecting = false
      state.syncedUploadLength = remoteUploadLength
      state.syncedDownloadLength = remoteDownloadLength
      emitter.emit(
        'updateDocLastSync',
        {
          key,
          syncedUploadLength: remoteUploadLength,
          syncedDownloadLength: remoteDownloadLength
        }
      )
    }
    emitter.emit('render')
  }

  function updateConnecting (connecting) {
    state.connecting = connecting
  }

  function readShoppingList () {
    const archive = state.archive
    const shoppingList = []
    archive.readdir('/shopping-list', (err, fileList) => {
      if (err) {
        console.log('Error', err)
        state.error = 'Error loading shopping list'
        emitter.emit('render')
        return
      }
      console.log('Shopping list files:', fileList.length)
      readTitleFromDatJson((err, title) => {
        if (err) {
          console.log('Error', err)
          state.error = 'Error loading shopping list'
          emitter.emit('render')
          return
        }
        readShoppingListFiles(err => {
          if (err) {
            console.log('Error', err)
            state.error = 'Error loading shopping list'
            emitter.emit('render')
            return
          }
          console.log('Done reading files.', title)
          updateAuthorized(err => {
            if (err) throw err
            state.loading = false
            state.docTitle = title
            state.shoppingList = shoppingList
            emitter.emit('writeNewDocumentRecord', state.params.key, title)
            emitter.emit('render')
          })
        })
      })

      function readTitleFromDatJson (cb) {
        archive.readFile('dat.json', 'utf8', (err, contents) => {
          if (err) {
            console.error('dat.json error', err)
            return cb(null, 'Unknown')
          }
          if (!contents) return cb(null, 'Unknown')
          try {
            const metadata = JSON.parse(contents)
            cb(null, metadata.title)
          } catch (e) {
            console.error('Parse error', e)
            cb(null, 'Unknown')
          }
        })
      }

      function readShoppingListFiles (cb) {
        const file = fileList.shift()
        if (!file) return cb()
        archive.readFile(`/shopping-list/${file}`, 'utf8', (err, contents) => {
          if (err) return cb(err)
          try {
            const item = JSON.parse(contents)
            item.file = file
            shoppingList.push(item)
          } catch (e) {
            console.error('Parse error', e)
          }
          readShoppingListFiles(cb)
        })
      }
    })
  }

  function updateAuthorized (cb) {
    if (state.authorized === true) return cb()
    const db = state.archive.db
    console.log('Checking if local key is authorized')
    db.authorized(db.local.key, (err, authorized) => {
      if (err) return cb(err)
      console.log('Authorized status:', authorized)
      if (
        state.authorized === false &&
        authorized === true &&
        !state.writeStatusCollapsed
      ) {
        emitter.emit('toggleWriteStatusCollapsed')
      }
      state.authorized = authorized
      cb()
    })
  }

  emitter.on('toggleBought', itemFile => {
    const item = state.shoppingList.find(item => item.file === itemFile)
    console.log('toggleBought', itemFile, item)
    // item.bought = !item.bought
    const archive = state.archive
    const json = JSON.stringify({
      name: item.name,
      bought: !item.bought,
      dateAdded: item.dateAdded
    })
    archive.writeFile(`/shopping-list/${item.file}`, json, err => {
      if (err) throw err
      console.log(`Rewrote: ${item.file}`)
    })
  })

  emitter.on('remove', itemFile => {
    const item = state.shoppingList.find(item => item.file === itemFile)
    console.log('remove', itemFile, item)
    // item.bought = !item.bought
    const archive = state.archive
    archive.unlink(`/shopping-list/${item.file}`, err => {
      if (err) throw err
      console.log(`Unlinked: ${item.file}`)
    })
  })

  emitter.on('addItem', name => {
    console.log('addItem', name)
    const archive = state.archive
    const json = JSON.stringify({
      name,
      bought: false,
      dateAdded: Date.now()
    })
    const file = newId() + '.json'
    archive.writeFile(`/shopping-list/${file}`, json, err => {
      if (err) throw err
      console.log(`Created: ${file}`)
    })
  })

  emitter.on('authorize', writerKey => {
    console.log('authorize', writerKey)
    if (!writerKey.match(/^[0-9a-f]{64}$/)) {
      customAlert.show('Key must be a 64 character hex value')
      return
    }
    const archive = state.archive
    archive.authorize(toBuffer(writerKey, 'hex'), err => {
      if (err) {
        customAlert.show('Error while authorizing: ' + err.message)
      } else {
        console.log(`Authorized.`)
        customAlert.show('Authorized new writer')
      }
      emitter.emit('render')
    })
  })

  emitter.on('toggleWriteStatusCollapsed', docName => {
    state.writeStatusCollapsed = !state.writeStatusCollapsed
    window.localStorage.setItem(
      'writeStatusCollapsed',
      state.writeStatusCollapsed
    )
    emitter.emit('render')
  })

  emitter.on('downloadZip', () => {
    console.log('Download zip')
    downloadZip(state.archive)
  })
}
