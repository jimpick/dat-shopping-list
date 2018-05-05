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

    ul {
      padding: 0 0.3rem 0.5rem 0.3rem;
    }

    li {
      list-style-type: none;
      border: 1px solid var(--color-neutral-20);
      border-radius: 0.5rem;
      margin: 0 0 0.5rem 0;
      padding: 0 0.5rem;
      min-height: 3rem;
      cursor: pointer;
      font-size: 1.2rem;
      display: flex;
      align-items: center;

      &:focus {
        outline: none;
        border-color: var(--color-green);
      }

      input[type="checkbox"] {
        pointer-events: none;
        margin: 0 0.4rem;
      }

      .text {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        margin: 0.5rem;
      }

      .text[data-bought="true"] {
        text-decoration: line-through;
      }

      .delete {
        opacity: 0.6;
        font-size: 1.5rem;
        font-weight: 900;
        color: var(--color-green);
        flex: 0 0;
        padding: 0.6rem 0.6rem;
      }

      &.addGroceryItem {
        border-color: transparent;

        form {
          display: flex;
          margin: 0 0 0 1.5rem;
          width: 100%;

          input[type="text"] {
            font-size: 1.2rem;
            flex: 1;
            width: 100%;
          }

          input[type="submit"] {
            margin-left: 0.6rem;
          }
        }
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
  emit('DOMTitleChange', 'Dat Shopping List - ' + state.docTitle)

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

  const items = state.shoppingList
    .sort((a, b) => a.dateAdded - b.dateAdded)
    .map(item => {
      const id = item.file.replace('.json', '')
      return html`
        <li tabindex="0" role="button" onclick=${toggle.bind(item)} onkeydown=${keydown}>
          <input type="checkbox" checked=${item.bought} tabindex="-1" id=${id}>
          <div class="text" data-bought=${item.bought}>${item.name}</div>
          <div class="delete" onclick=${remove.bind(item)} tabindex="0">${raw('&#x00d7;')}</div>
        </li>
      `

      function toggle () {
        emit('toggleBought', this.file)
      }

      function remove (event) {
        emit('remove', this.file)
        event.stopPropagation()
      }
    })
  const addItemInput = html`<input type="text">`
  addItemInput.isSameNode = function (target) {
    return (target && target.nodeName && target.nodeName === 'INPUT')
  }

  items.push(html`
    <li class="addGroceryItem" id="addItem">
      <form onsubmit=${submitAddItem}>
        ${addItemInput}
        ${button.submit('Add')}
      </form>
    </li>
  `)
  function submitAddItem (event) {
    const input = event.target.querySelector('input')
    const name = input.value.trim()
    if (name !== '') emit('addItem', name)
    input.value = ''
    event.preventDefault()
    event.target.scrollIntoView()
  }
  const noItems = state.shoppingList.length === 0 ? html`<p>No items.</p>` : null
  return layout(html`
    <div>
      ${shoppingListTitle(state, emit)}
      ${writeStatus(state, emit)}
      <ul>
        ${items}
      </ul>
      ${noItems}
    </div>
  `)

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
