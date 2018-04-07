const html = require('choo/html')
const raw = require('choo/html/raw')
const choo = require('choo')
const rai = require('random-access-idb')
const websocket = require('websocket-stream')
const pump = require('pump')
const prettyHash = require('pretty-hash')
const toBuffer = require('to-buffer')
const hyperdrive = require('hyperdrive')
const crypto = require('hypercore/lib/crypto')
const newId = require('monotonic-timestamp-base36')
const GitHubButton = require('./githubButton')

const app = choo()
app.use(store)
app.route('/', indexView)
app.route('/create', createView)
app.route('/doc/:key', docView)
app.mount('body')

const gitHubButton = new GitHubButton()

const ghButton = html`${gitHubButton.render()}`
// const ghButton = null

const footer = html`
  <footer>
    <a href="https://glitch.com/edit/#!/dat-multiwriter-web">
      <img src="https://cdn.glitch.com/2bdfb3f8-05ef-4035-a06e-2043962a3a13%2Fview-source%402x.png?1513093958802"
            alt="view source button" aria-label="view source" height="33">
    </a>
    <a href="https://glitch.com/edit/#!/remix/dat-multiwriter-web">
      <img src="https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg"
            alt="Remix on Glitch" />
    </a>
    ${ghButton}
  </footer>
`

function indexView (state, emit) {
  const documents = state.documents.map(doc => {
    return html`
      <li>
        <a href="/doc/${doc.key}">${prettyHash(doc.key)} ${doc.name}
      </li>
    `
  })
  return html`
    <body>
      <h2>
        Dat Multiwriter on the Web Demo
      </h2>
      <header>
        <ul>
          ${documents}
        </ul>
        <button class="bigBtn" onclick="${() => emit('pushState', '/create')}">
          Create a new document
        </button>
      </header>
      <section id="content">
      </section>
      ${footer}
    </body>
  `
}

function createView (state, emit) {
  return html`
    <body>
      <h2>
        Enter name for your new document
      </h2>
      <form onsubmit=${submit}>
        <input type="text">
        <input type="submit">
      </form>
    </body>
  `
  
  function submit (event) {
    const docName = event.target.querySelector('input').value
    if (docName) {
      emit('createDoc', docName)
    }    
    event.preventDefault()
  }
}

function docView (state, emit) {
  const db = state.archive && state.archive.db
  let writeStatus = null
  if (db) {
    const sourceCopy = db.local === db.source ?
        'You created this document.' : 'You joined this document.'
    let authStatus = null
    if (state.authorized) {
      authStatus = html`<div>You are authorized to write to the document.</div>`
    } else {
      authStatus = html`<div>You are not currently authorized to write to the document.<br>
        Your local key is: ${db.local.key.toString('hex')}</div>`
    }
    let authForm = null
    if (state.authorized) {
      authForm = html`
        <form onsubmit=${submit}>
          Add a writer: <input type="text" placeholder="Writer Local Key">
          <input type="submit" value="Authorize">
        </form>
      `
      function submit (event) {
        const writerKey = event.target.querySelector('input').value.trim()
        if (writerKey !== '') emit('authorize', writerKey)
        event.preventDefault()
      }
    }
    writeStatus = html`<section id="writeStatus">
        <div>${sourceCopy}</div>
        ${authStatus}
        ${authForm}
      </section>
    `
  }
  const loading = state.loading ? html`Loading...` : null
  const items = state.shoppingList.map(item => {
    return html`
      <li class="groceryItem">
        <span onclick=${toggle.bind(item)} data-bought=${item.bought}>
          ${item.name}
        </span>
        <span class="delete" onclick=${remove.bind(item)}>${raw('&#x00d7;')}</span>
      </li>
    `
    
    function toggle () {
      emit('toggleBought', this.file)
    }
    
    function remove () {
      emit('remove', this.file)
    }
  })
  items.push(html`
    <li class="addGroceryItem">
      <form onsubmit=${submitAddItem}>
        <input type="text">
        <input type="submit" value="Add">
      </form>
    </li>
  `)
  function submitAddItem (event) {
    const name = event.target.querySelector('input').value.trim()
    if (name !== '') emit('addItem', name)
    event.preventDefault()
  }
  const noItems = !state.loading && state.shoppingList.length === 0 ? html`<p>No items.</p>` : null
  return html`
    <body>
      <h2>
        Shopping List
      </h2>
      ${writeStatus}
      <i>Click items to cross them off.</i>
      <section id="content">
        ${loading}
        <ul>
          ${items}
        </ul>
        ${noItems}
        <a href="/">Back to top</a>
      </section>
      ${footer}
    </body>
  `
}

function store (state, emitter) {
  state.shoppingList = []
  state.documents = []
  
  // Store documents in indexedDB
  function openDocumentsDB (cb) {
    const request = window.indexedDB.open('documents', 1)
    request.onerror = function (event) {
      console.log('IndexedDB error')
    }
    request.onsuccess = function (event) {
      state.documentsDB = event.target.result
      readDocuments(cb)
    }
    request.onupgradeneeded = function (event) {
      const db = event.target.result
      const objectStore = db.createObjectStore("documents", {keyPath: 'key'})
      objectStore.createIndex('name', 'name')
      objectStore.transaction.oncomplete = function (event) {
        console.log('Document db created')
      }
    }
  }
  function writeDocumentRecord (key, name) {
    const db = state.documentsDB
    if (!db) return
    const request = db.transaction('documents', 'readwrite')
      .objectStore('documents')
      .add({key, name})
    request.onsuccess = function (event) {
      readDocuments(() => {
        console.log('documents reloaded')
      })
    }
  }
  function readDocuments (cb) {
    const db = state.documentsDB
    if (!db) return
    console.log('Jim readDocuments')
    const objectStore = db.transaction('documents').objectStore('documents')
    const index = objectStore.index('name')
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
  openDocumentsDB(() => {
    console.log('documents loaded', state.documents)
    emitter.emit('render')
  })
  
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
      let shoppingList = ['rice', 'bananas', 'kale', 'avocado', 'bread', 'quinoa', 'beer']
      writeShoppingListItems(() => {
        console.log('Done')
        writeDocumentRecord(keyHex, docName)
        emitter.emit('pushState', `/doc/${keyHex}`)
      })
      
      function writeShoppingListItems (cb) {
        const item = shoppingList.shift()
        if (!item) return cb()
        console.log(item)
        const json = JSON.stringify({
          name: item,
          bought: false
        })
        archive.writeFile(`/shopping-list/${newId()}.json`, json, err => {
          if (err) throw err
          writeShoppingListItems(cb)
        })
      }
    })
  })
  
  emitter.on('DOMContentLoaded', updateDoc)
  emitter.on('navigate', updateDoc)
  
  function updateDoc () {
    state.authorized = null
    state.shoppingList = []
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
      bought: !item.bought
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
      // readShoppingList()
    })
  })
  
  emitter.on('addItem', name => {
    console.log('addItem', name)
    const archive = state.archive
    const json = JSON.stringify({
      name,
      bought: false
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
