const html = require('choo/html')
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

const footer = html`
  <footer>
    <a href="https://glitch.com/edit/#!/dat-multiwriter-web-dev">
      <img src="https://cdn.glitch.com/2bdfb3f8-05ef-4035-a06e-2043962a3a13%2Fview-source%402x.png?1513093958802"
            alt="view source button" aria-label="view source" height="33">
    </a>
    <a href="https://glitch.com/edit/#!/remix/dat-multiwriter-web-dev">
      <img src="https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg"
            alt="Remix on Glitch" />
    </a>
    ${gitHubButton.render()}
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
      <form onsubmit="${submit}">
        <input id="docName" type="text">
        <input type="submit">
      </form>
    </body>
  `
  
  function submit (event) {
    const docName = document.querySelector('#docName').value
    if (docName) {
      emit('createDoc', docName)
    }
    
    event.preventDefault()
  }
}

function docView (state, emit) {
  const loading = state.loading ? html`Loading...` : null
  const items = state.shoppingList.map(item => {
    return html`
      <li>
        ${item.name}
      </li>
    `
  })
  const noItems = !state.loading && state.shoppingList.length === 0 ? html`No items.` : null
  return html`
    <body>
      <h2>
        Shopping List
      </h2>
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
        state.key = archive.key
        state.archive = archive
        connectToGateway(archive)
        archive.readdir('/shopping-list', (err, fileList) => {
          console.log('Shopping list files:', fileList.length)
          readShoppingListFiles(() => {
            console.log('Done reading files.')
            state.loading = false
            emitter.emit('render')
          })
          
          function readShoppingListFiles (cb) {
            const file = fileList.shift()
            if (!file) return cb()
            // console.log(`Loading ${file}`)
            archive.readFile(`/shopping-list/${file}`, 'utf8', (err, contents) => {
              try {
                const item = JSON.parse(contents)
                item.file = file
                state.shoppingList.push(item)
              } catch (e) {
                console.error('Parse error', e)
              }
              readShoppingListFiles(cb)
            })
          }
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
            archive.replicate({encrypt: false}),
            stream,
            err => {
              console.log('Pipe finished', err.message)
              connectWebsocket()
            }
          )
        }
        connectWebsocket()
      }
    }
  }

  /*
  const multicore = new Multicore(debugStorage)
  multicore.ready(() => {
    const archiverKey = multicore.archiver.changes.key.toString('hex')
    console.log('Archiver key:', archiverKey)

    emitter.on('publish', () => {
      const archive = state.currentArchive ? state.currentArchive
        : multicore.createArchive()
      const value = editor.codemirror.getValue()
      archive.ready(() => {
        const key = archive.key.toString('hex')
        const datJson = {
          url: `dat://${key}/`,
          title: document.getElementById('title').value,
          description: ''
        }
        archive.writeFile('/dat.json', JSON.stringify(datJson, null, 2), err => {
          if (err) {
            console.error('Error writing to Dat', err)
            return
          }
          archive.writeFile('/index.html', value, err => {
            if (err) {
              console.error('Error writing to Dat', err)
              return
            }
            console.log(
              `Published:\n` +
              `metadata ${prettyHash(archive.metadata.key)} ` +
              `dk: ${prettyHash(archive.metadata.discoveryKey)} ` +
              `length: ${archive.metadata.length}\n` +
              `content ${prettyHash(archive.content.key)} ` +
              `dk: ${prettyHash(archive.content.discoveryKey)} ` +
              `length: ${archive.content.length}`
            )
            state.currentArchive = archive
            multicore.replicateFeed(archive)
            emitter.emit('pushState', `/page/${key}`)
          })
        })
      })
    })

    emitter.on('navigate', updateDoc)
    
    emitter.on('delete', key => {
      console.log('Deleting', key)
      state.currentArchive = null
      state.indexHtml = ''
      state.title = ''
      multicore.archiver.remove(key, () => {
        delete state.archives[key]
        emitter.emit('pushState', '/')
      })
    })

    const host = document.location.host
    const proto = document.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${host}/archiver/${archiverKey}`

    function connectWebsocket () {
      console.log('Connecting websocket', url)
      const stream = websocket(url)
      pump(
        stream,
        multicore.archiver.replicate({encrypt: false}),
        stream,
        err => {
          console.log('Pipe finished', err.message)
          connectWebsocket()
        }
      )
    }
    connectWebsocket()

    multicore.archiver.on('add', feed => {
      multicore.replicateFeed(feed)
    })
    multicore.archiver.on('add-archive', readMetadata)
    Object.keys(multicore.archiver.archives).forEach(dk => {
      const archive = multicore.archiver.archives[dk]
      readMetadata(archive.metadata, archive.content)
    })
    updateDoc()

    function updateDoc () {
      if (!state.params.key) {
        state.title = 'My Dat Page'
        state.indexHtml = template
        state.currentArchive = null
        emitter.emit('render')
      } else {
        const key = state.params.key
        let archive
        if (state.archives[key] && state.archives[key].archive) {
          archive = state.archives[key].archive
          console.log('Key found (cached)', key)
        } else {
          const dk = hypercore.discoveryKey(toBuffer(key, 'hex'))
            .toString('hex')
          if (multicore.archiver.archives[dk]) {
            archive = multicore.archiver.getHyperdrive(dk)
            if (!state.archives[key]) {
              state.archives[key] = {dk}
            }
            state.archives[key].archive = archive
            console.log('Key found (loaded)', key)
          } else {
            console.error('Key not found locally', key)
            // It might be better to display an error in the UI
            emitter.emit('pushState', '/')
          }
        }
        readMetadata(archive.metadata)
        archive.readFile('index.html', 'utf-8', (err, data) => {
          if (err) {
            console.error('Error reading index.html', key, err)
            return
          }
          try {
            state.indexHtml = data
            state.currentArchive = archive
            emitter.emit('render')
          } catch (e) {
            // FIXME: Throw an error to the UI
          }
        })
      }
    }

    function readMetadata (metadata) {
      const key = metadata.key.toString('hex')
      const dk = metadata.discoveryKey.toString('hex')
      if (!state.archives[key]) {
        state.archives[key] = {dk}
      }
      emitter.emit('render')
      let archive
      if (state.archives[key].archive) {
        archive = state.archives[key].archive
      } else {
        archive = multicore.archiver.getHyperdrive(dk)
        state.archives[key].archive = archive
      }
      archive.readFile('dat.json', 'utf-8', (err, data) => {
        if (err) {
          // console.error('Error reading dat.json', key, err)
          return
        }
        try {
          const {title} = JSON.parse(data.toString())
          state.archives[key].title = title
          if (state.params.key === key) state.title = title
          emitter.emit('render')
        } catch (e) {
          // Don't worry about it
        }
      })
    }
  })
  */
}
