const choo = require('choo')
const chooServiceWorker = require('choo-service-worker')
const css = require('sheetify')

const networkStatusStore = require('./stores/networkStatus')
const documentsStore = require('./stores/documents')
const shoppingListStore = require('./stores/shoppingList')

const mainView = require('./views/main')
const createView = require('./views/create')
const shoppingListView = require('./views/shoppingList')

css('dat-colors')
css('./index.css')

const app = choo()

// app.use(require('choo-service-worker/clear')())
app.use(chooServiceWorker())

app.use(state => {
  state.glitchAppName = 'dat-shopping-list'
  state.gitHubRepoName = 'jimpick/dat-shopping-list'
})
app.use(networkStatusStore)
app.use(documentsStore)
app.use(shoppingListStore)

app.route('/', mainView)
app.route('/create', createView)
app.route('/doc/:key', shoppingListView)

app.mount('body')