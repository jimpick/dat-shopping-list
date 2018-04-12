const html = require('choo/html')
const css = require('sheetify')
const prettyHash = require('pretty-hash')
const footer = require('../components/footer')

module.exports = mainView

const prefix = css`
  .hash {
    font-size: 12px;
    font-family: monospace;
  }
`

function mainView (state, emit) {
  const documents = state.documents.map(doc => {
    return html`
      <li>
        <span class="hash">${prettyHash(doc.key)}</span>
        <a href="/doc/${doc.key}">${doc.name}
      </li>
    `
  })
  return html`
    <body class=${prefix}>
      <h2>
        Dat Multiwriter on the Web Demo
      </h2>
      <h3>Shopping Lists</h3>
      <header>
        <ul>
          ${documents}
        </ul>
        <button class="bigBtn" onclick="${() => emit('pushState', '/create')}">
          Create a new Shopping List
        </button>
      </header>
      <section id="content">
      </section>
      ${footer(state)}
    </body>
  `
}

