const html = require('choo/html')
const raw = require('choo/html/raw')
const css = require('sheetify')
const header = require('../components/header')
const button = require('../components/button')
const footer = require('../components/footer')
const debugTools = require('../components/debugTools')
const shoppingListTitle = require('../components/shoppingListTitle')
const writeStatus = require('../components/writeStatus')
const customAlert = require('../components/customAlert')

const prefix = css`
  :host {
    .content {
      margin: 1rem 1rem 2rem 1rem;
    }

    .error {
      padding: 1rem;
      border: 2px solid red;
      border-radius: 1rem;
      text-align: center;
      margin: 1rem;
    }

    .tiddlyButton {
      display: flex;
      height: 8rem;
      align-items: center;
      justify-content: center;

      button {
        font-size: 1.2rem;
        padding: 1.3rem;
      }
    }

    .bottomNav {
      .delete {
        color: var(--color-red);
        text-decoration: none;
        float: right;
      }
    }
  }
`

module.exports = shoppingListView

function shoppingListView (state, emit) {
  emit('DOMTitleChange', 'Dat TiddlyWiki - ' + state.docTitle)

  function layout (inner) {
    return html`
      <body class=${prefix}>
        ${header(state)}
        <section class="content">
          ${inner}
          <nav class="bottomNav">
            <a href="/" class="link">Home</a>
            <a href="/" class="delete" onclick=${deleteList}>Delete List</a>
          </nav>
        </section>
        ${footer(state)}
        ${debugTools(state, emit)}
        ${customAlert.alertBox(state, emit)}
      </body>
    `
  }

  if (state.error) {
    return layout(html`
      <div class="error">
        ${state.error}<br>
        (Try reloading, there occasionally are problems during sync)
      </div>
    `)
  }
  if (state.loading) return layout('Loading...')

  return layout(html`
    <div>
      ${shoppingListTitle(state, emit)}
      ${writeStatus(state, emit)}
      <div class="tiddlyButton">
        ${button.button('View TiddlyWiki', openTiddlyWiki)}
      </div>
    </div>
  `)

  function openTiddlyWiki (event) {
    const url = `/doc/${state.key.toString('hex')}/tw`
    location.href = url
  }

  function deleteList (event) {
    const confirm = window.confirm('Delete this list?')
    if (confirm) {
      emit('deleteCurrentDoc')
    }
    event.preventDefault()
  }

  function keydown (event) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.target.click()
    }
  }
}
