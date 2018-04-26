const html = require('choo/html')
const raw = require('choo/html/raw')
const css = require('sheetify')
const copy = require('clipboard-copy')
const prettyHash = require('pretty-hash')
const header = require('../components/header')
const button = require('../components/button')
const footer = require('../components/footer')

const prefix = css`
  :host {
    .content {
      margin: 1rem 1rem 2rem 1rem;
    }

    .title {
      position: relative;
      h1 {
        margin: 0 0 0.5em 0;
      }
      .hash {
        font-size: 12px;
        font-family: monospace;
        position: absolute;
        top: 0;
        right: 0;
        cursor: pointer;
      }
    }

    #writeStatus {
      box-shadow: 0 0 10px rgba(0,0,0,.15);
      padding: 0.7rem;
      position: relative;
      -webkit-tap-highlight-color: transparent;

      .collapseExpand {
        position: absolute;
        top: -0.8rem;
        right: 0.6rem;
        z-index: 1;
        font-size: 0.8rem;
        cursor: pointer;
        color: var(--color-green);
        background: var(--color-white);
        border: 2px solid var(--color-neutral-10);
        border-radius: 0.8rem;
        width: 5rem;
        height: 1.4rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .noAuth {
        color: var(--color-red);
        font-weight: 700;
      }

      .okAuth {
        color: var(--color-green);
        font-weight: 700;
      }

      .help {
        font-size: 0.8rem;
        font-weight: 500;
        margin-left: 0.5rem;
        margin-right: 0.5rem;
      }

      .localKeySection {
        -webkit-tap-highlight-color: black;
        background: var(--color-neutral-10);
        padding: 0.5rem;

        .noWrap {
          white-space: nowrap;
          display: flex;

          .localKey {
            color: var(--color-blue-darker);
            text-overflow: ellipsis;
            overflow: hidden;
          }
        }

        @media only screen and (min-device-width : 500px) and (max-device-width : 600px) {
          .localKey {
            font-size: 12px;
          }
        }

        @media only screen and (min-device-width : 400px) and (max-device-width : 500px) {
          .localKey {
            font-size: 10px;
          }
        }

        @media only screen and (max-width : 400px) {
          .localKey {
            font-size: 8px;
          }
        }

        button {
          font-size: 0.7rem;
          padding: 0.5rem 0.5rem;
          font-weight: 400;
          margin-right: 1rem;
        }
      }

      form {
        margin: 0;
        
        .writerInputs {
          display: flex;

          input[type="text"] {
            flex: 1;
            margin-left: 0.4rem;
          }

          input[type="submit"] {
            font-size: 0.7rem;
            margin-left: 0.4rem;
            padding: 0.1rem 0.5rem;
            font-weight: 400;
          }
        }

      }
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
      height: 3rem;
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
        margin: 0 0.5rem;
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
            flex: 0;
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

    .debugTools {
      margin: 2rem;
    }
  }
`

module.exports = shoppingListView

function shoppingListView (state, emit) {
  const debugTools = html`
    <div class="debugTools">
      Debug tools: ${' '}
      <a href="#" class="link" onclick=${downloadZip}>Download Zip</a>
    </div>
  `  
  if (state.loading ) {
    return html`
      <body class=${prefix}>
        ${header()}
        <section class="content">
          Loading...
          <nav class="bottomNav">
            <a href="/" class="link">Home</a>
            <a href="/" class="delete" onclick=${deleteList}>Delete List</a>
          </nav>
        </section>
        ${footer(state)}
        ${debugTools}
      </body>
    `
  }
  const db = state.archive && state.archive.db
  let writeStatus = null
  if (db) {
    let sourceCopy = null
    if (!state.writeStatusCollapsed) {
      sourceCopy = db.local === db.source ?
          'You created this document.' : 'You joined this document.'
    }
    let authStatus = null
    if (state.authorized) {
      if (state.writeStatusCollapsed) {
        authStatus = html`<div><span class="okAuth">Authorized</span> (Expand to add a writer)</div>`
      } else {
        authStatus = html`<div class="okAuth">You are authorized to write to this document.</div>`
      }
    } else {
      const localKey = db.local.key.toString('hex')
      let explanationAndLocalKey = null
      if (!state.writeStatusCollapsed) {
        explanationAndLocalKey = html`
          <div>
            <p class="help">
              You may edit your local copy, but changes will not be synchronized until you
              pass your "local key" to an owner of the document and they authorize you.
            </p>
            <div class="localKeySection" onclick=${e => e.stopPropagation()}>
              Your local key is:
              <div class="noWrap">
                <span class="localKey">${localKey}</span>
              </div>
              ${button.button('Copy to Clipboard', copyToClipboard)}
              ${state.localKeyCopied ? 'Copied!' : null}
            </div>
          </div>
        `
        function copyToClipboard () {
          copy(localKey).then(() => {
            alert('"Local Key" copied to clipboard')
            state.localKeyCopied = true
            emit('render')
          })
        }
      }
      let noAuth
      if (!state.writeStatusCollapsed) {
        noAuth = html`<div class="noAuth">
          You are not currently authorized to write to this document.
        </div>`
      } else {
        noAuth = html`<div>
          <span class="noAuth">Not authorized</span>
          (Expand for more info)
        </div>`        
      }
      authStatus = html`<div>
        ${noAuth}
        ${explanationAndLocalKey}
      </div>`
    }
    let authForm = null
    if (!state.writeStatusCollapsed && state.authorized) {
      authForm = html`
        <form onsubmit=${submit}>
          <p class="help">
            You can share this shopping list to multiple devices or other
            people. Just copy the URL and paste it into another browser.
            (Hint: You can click
            on the "hex number" on the upper right to copy the URL to your
            clipboard). Other copies may write to this document if you
            authorize them by pasting their 'local key' into the form below.
          </p>
          <div class="writerInputs" onclick=${e => e.stopPropagation()}>
            <div>Add a writer:</div> 
            <input type="text" placeholder="Writer Local Key" spellcheck="false">
            ${button.submit('Authorize')}
          </div>
        </form>
      `
      function submit (event) {
        const writerKey = event.target.querySelector('input').value.trim()
        if (writerKey !== '') emit('authorize', writerKey)
        event.preventDefault()
      }
    }
    const collapseExpand = state.writeStatusCollapsed ?
            raw('&#x25bc; Expand') : raw('&#x25b2; Collapse')
    writeStatus = html`
      <section id="writeStatus" onclick=${() => emit('toggleWriteStatusCollapsed')}>
        <div class="collapseExpand">
          ${collapseExpand}
        </div>
        <div>${sourceCopy}</div>
        ${authStatus}
        ${authForm}
      </section>
    `
  }
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
      
      function keydown (event) {
        if (event.key === ' ' || event.key === 'Enter') {
          event.target.click()
        }
      }

    })
  items.push(html`
    <li class="addGroceryItem" id="addItem">
      <form onsubmit=${submitAddItem}>
        <input type="text">
        ${button.submit('Add')}
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
    <body class=${prefix}>
      ${header(state)}
      <section class="content">
        <div class="title">
          <h1>${state.title}</h1>
          <div class="hash" onclick=${copyUrl}>
            ${prettyHash(state.key)}
          </div>
        </div>
        ${writeStatus}
        <ul>
          ${items}
        </ul>
        ${noItems}
        <nav class="bottomNav">
          <a href="/" class="link">Home</a>
          <a href="/" class="delete" onclick=${deleteList}>Delete List</a>
        </nav>
      </section>
      ${footer(state)}
      ${debugTools}
    </body>
  `

  function copyUrl (event) {
    copy(document.location.href).then(() => {
      alert('Shopping list URL copied to clipboard')
    })
  }
  
  function deleteList (event) {
    const confirm = window.confirm('Delete this list?')
    if (confirm) {
      emit('deleteCurrentDoc')
    }
    event.preventDefault()
  }

  function downloadZip (event) {
    emit('downloadZip')
    event.preventDefault()
  }
}
