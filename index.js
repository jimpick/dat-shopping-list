const html = require('choo/html')
const choo = require('choo')
const rai = require('random-access-idb')
const websocket = require('websocket-stream')
const pump = require('pump')
const prettyHash = require('pretty-hash')
const toBuffer = require('to-buffer')
const GitHubButton = require('./githubButton')

require('events').prototype._maxListeners = 100

const storage = rai('codemirror-multicore')

const app = choo()
app.use(store)
app.route('/', indexView)
// app.route('/doc/:key', mainView)
app.mount('body')

const gitHubButton = new GitHubButton()

function indexView (state, emit) {
  return html`
    <body>
      <h2>
        Dat Multiwriter on the Web Demo
      </h2>
      <header>
        <button>Create a new document</button>
      </header>
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
    </body>
  `
}

/*
function mainView (state, emit) {
  let link = html`<span class="help">Edit the HTML below, then click on "Publish" to create a new web site!</span>`
  let webPageKey
  let disabledNoCurrent = 'disabled'
  if (state.currentArchive && state.currentArchive.key) {
    webPageKey = state.currentArchive.key.toString('hex')
    const url = `dat://${webPageKey}`
    link = html`<a href=${url}>${url}</a>`
    disabledNoCurrent = null
  }
  let found = false
  const optionList = Object.keys(state.archives).sort().map(key => {
    let label = prettyHash(key)
    const title = state.archives[key].title
    if (title) {
      label += ` ${title}`
    }
    const selected = webPageKey === key ? 'selected' : ''
    if (selected) found = true
    return html`<option value=${key} ${selected}>${label}</option>`
  })
  const optGroup = optionList.length > 0 ? html`
    <optgroup label="Load">
      ${optionList}
    </optgroup>` : null
  const selectNew = found ? '' : 'selected'
  return html`
    <body>
      <h2>
        Create a webpage on the Peer-to-Peer Web!
      </h2>
      <header>
        <select name="docs" onchange=${selectPage}>
          <option value="new" ${selectNew}>Create a new webpage...</option>
          ${optGroup}
        </select>
        <div class="title">
          <span>Title:</span>
          <input id="title" name="title" value="${state.title}">
        </div>
        <button class="publishBtn" onclick=${() => emit('publish')}>
          Publish
        </button>
        <div class="link">
          ${link}
        </div>
      </header>
      ${editor.render(state.indexHtml)}
      <footer>
        <a href="https://glitch.com/edit/#!/codemirror-multicore">
          <img src="https://cdn.glitch.com/2bdfb3f8-05ef-4035-a06e-2043962a3a13%2Fview-source%402x.png?1513093958802"
                alt="view source button" aria-label="view source" height="33">
        </a>
        <a href="https://glitch.com/edit/#!/remix/codemirror-multicore">
          <img src="https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg"
                alt="Remix on Glitch" />
        </a>
        ${gitHubButton.render()}
        <select id="more" onchange=${selectMore}>
          <option selected>More...</option>
          <option ${disabledNoCurrent}>Delete</option>
          <option ${disabledNoCurrent}>Export</option>
        </select>
      </footer>
    </body>
  `

  function selectPage (e) {
    const key = e.target.value
    if (key === 'new') {
      emit('pushState', `/`)
    } else {
      emit('pushState', `/page/${key}`)
    }
  }
  
  function selectMore (e) {
    console.log('Jim more', e.target.value)
    switch (e.target.value) {
      case 'Delete':
        const ok = confirm(
          'Delete this web page?\n\n' +
          'This will delete the master copy in your web browser, ' +
          'but other replicas that may have been synced will ' +
          'still exist.'
        )
        if (ok) {
          emit('delete', webPageKey)
        }
        break;
      case 'Export':
        const secretKey = state.currentArchive.metadata.secretKey.toString('hex')
        console.log('Export', webPageKey, secretKey)
        alert(
          'You can export the data and the secret key to the command-line ' +
          'dat tool. First, you need to clone the data:\n\n' +
          `dat clone dat://${webPageKey}\n\n` +
          'Then change directory into the new directory, and import the ' +
          'secret key:\n\n' +
          'dat keys import\n\n' +
          `The secret key is:\n\n${secretKey}\n\n` +
          'IMPORTANT: Delete your old master copy in the web browser after importing, as ' +
          'there must only be one master copy.'
        )
        break;
      case 'Settings':
        alert('Settings')
        break;
    }
    e.target.selectedIndex = 0
  }
}
*/

function store (state, emitter) {
  state.archives = {}
  state.currentArchive = null
  state.indexHtml = ''
  state.title = ''

  function debugStorage (name) {
    // console.log('debugStorage:', name)
    return storage(name)
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
