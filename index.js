const choo = require('choo')
const chooServiceWorker = require('choo-service-worker')
const css = require('sheetify')

const networkStatusStore = require('./stores/networkStatus')
const documentsStore = require('./stores/documents')
const shoppingListStore = require('./stores/shoppingList')

const mainView = require('./views/main')
const createView = require('./views/create')
const addLinkView = require('./views/addLink')
const shoppingListView = require('./views/shoppingList')

css('dat-colors')
css('./index.css')

const app = choo()

// app.use(require('choo-service-worker/clear')())
app.use(chooServiceWorker())
app.use((state, emitter) => {
  emitter.on('sw:installed', () => { console.log('sw:installed') })
  emitter.on('sw:updated', () => { console.log('sw:updated') })
  emitter.on('sw:redundant', () => { console.log('sw:redundant') })
  if (navigator.serviceWorker) {
    console.log('Service worker controller', navigator.serviceWorker.controller)
    navigator.serviceWorker.getRegistrations()
      .then(registrations => {
        console.log('Service worker registrations', registrations)
      })
    navigator.serviceWorker.ready.then(serviceWorker => {
      console.log('Service worker ready', serviceWorker)
      state.serviceWorker = true
    })
  }
})

app.use(state => {
  state.glitchAppName = 'dat-shopping-list-tokyo'
  state.gitHubRepoName = 'jimpick/dat-shopping-list-tokyo'
  state.devMode = false
  state.devLabel = 'f'
})
app.use(networkStatusStore)
app.use(documentsStore)
app.use(shoppingListStore)

app.route('/', mainView)
app.route('/create', createView)
app.route('/add-link', addLinkView)
app.route('/doc/:key', shoppingListView)

app.mount('body')
