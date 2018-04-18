const rai = require('random-access-idb')
const websocket = require('websocket-stream')
const pump = require('pump')
const toBuffer = require('to-buffer')
const hyperdrive = require('hyperdrive')
const crypto = require('hypercore/lib/crypto')
const newId = require('monotonic-timestamp-base36')

module.exports = store

function store (state, emitter) {
  state.shoppingList = []
  state.localKeyCopied = false
  
  emitter.on('DOMContentLoaded', updateDoc)
  emitter.on('navigate', updateDoc)
  
  function updateDoc () {
    state.authorized = null
    state.shoppingList = []
    state.localKeyCopied = false
    if (!state.params || !state.params.key) {
      state.archive = null
      state.key = null
      state.loading = false
      emitter.emit('render')
    } else {
      const keyHex = state.params.key
      console.log(`Loading ${keyHex}`)
      const storage = rai(`doc-${keyHex}`)
      const archive = hyperdrive(storage, keyHex)
      state.loading = true
      emitter.emit('render')
      archive.ready(() => {
        console.log('hyperdrive ready')
        console.log('Local key:', archive.db.local.key.toString('hex'))
        console.log('Writers:')
        archive.db._writers.forEach(writer => {
          console.log('  ', writer._feed.key.toString('hex'), writer._feed.length)
        })
        state.archive = archive
        state.key = archive.key
        connectToGateway(archive)
        readShoppingList()
        archive.db.watch(() => {
          console.log('Archive updated:', archive.key.toString('hex'))
          console.log('Writers:')
          archive.db._writers.forEach(writer => {
            console.log('  ', writer._feed.key.toString('hex'), writer._feed.length)
          })
          readShoppingList()
        })
      })
      
      function connectToGateway(archive) {
        const key = archive.key.toString('hex')
        const host = document.location.host
        const proto = document.location.protocol === 'https:' ? 'wss' : 'ws'
        const url = `${proto}://${host}/archive/${key}`
        console.log('connectToGateway', key)

        function connectWebsocket () {
          console.log('Connecting websocket', url)
          const stream = websocket(url)
          pump(
            stream,
            archive.replicate({encrypt: false, live: true}),
            stream,
            err => {
              console.log('Pipe finished', err && err.message)
              setTimeout(connectWebsocket, 5000)
            }
          )
        }
        connectWebsocket()
      }
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
      writeShoppingListItems(() => {
        console.log('Done')
        emitter.emit('writeNewDocumentRecord', keyHex, docName)
      })
      
      function writeShoppingListItems (cb) {
        const item = shoppingList.shift()
        if (!item) return cb()
        console.log(item)
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
  
  function readShoppingList () {
    const archive = state.archive
    const shoppingList = []
    archive.readdir('/shopping-list', (err, fileList) => {
      console.log('Shopping list files:', fileList.length)
      readShoppingListFiles(() => {
        console.log('Done reading files.')
        state.loading = false
        state.shoppingList = shoppingList
        updateAuthorized(err => {
          if (err) throw err
          emitter.emit('render')
        })
      })

      function readShoppingListFiles (cb) {
        const file = fileList.shift()
        if (!file) return cb()
        archive.readFile(`/shopping-list/${file}`, 'utf8', (err, contents) => {
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
    const archive = state.archive
    archive.db.authorize(toBuffer(writerKey, 'hex'), err => {
      if (err) throw err
      console.log(`Authorized.`)
      emitter.emit('render')
    })
  })

}
