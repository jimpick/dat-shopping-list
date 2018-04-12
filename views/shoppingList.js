const html = require('choo/html')
const raw = require('choo/html/raw')
const footer = require('../components/footer')

module.exports = shoppingListView

function shoppingListView (state, emit) {
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
  const items = state.shoppingList
    .sort((a, b) => a.dateAdded - b.dateAdded)
    .map(item => {
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
      ${footer(state)}
    </body>
  `
}
