const choo = require('choo')

const documentsStore = require('./stores/documents')
const shoppingListStore = require('./stores/shoppingList')

const mainView = require('./views/main')
const createView = require('./views/create')
const shoppingListView = require('./views/shoppingList')

const app = choo()

app.use(state => {
  state.glitchAppName = 'dat-multiwriter-web'
  state.gitHubRepoName = 'jimpick/dat-multiwriter-web'
})
app.use(documentsStore)
app.use(shoppingListStore)

app.route('/', mainView)
app.route('/create', createView)
app.route('/doc/:key', shoppingListView)

app.mount('body')