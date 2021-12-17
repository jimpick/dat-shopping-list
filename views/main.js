const html = require('choo/html')
const css = require('sheetify')
const prettyHash = require('pretty-hash')
const header = require('../components/header')
const button = require('../components/button')
const footer = require('../components/footer')

const prefix = css`
  :host {
    .content {
      margin: 1rem 1rem 2rem 1rem;
    }
    .uvp {
      box-shadow: 0 0 20px rgba(0,0,0,.15);
      padding: 1em;
      background-color: var(--color-white);
    }
    .uvp h4 {
      margin: 0.5rem 1rem 1rem 1rem;
      font-size: 1.3rem;
      text-align: center;
    }
    h3 {
      margin-top: 2rem;
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
      position: relative;
      cursor: pointer;
      font-size: 1.2rem;
      background-color: var(--color-white);
      display: flex;

      .link {
        margin: 1rem 0.5rem;
      }

      span {
        font-size: 12px;
        font-family: monospace;
        line-height: 1rem;
        position: absolute;
        top: 0.1rem;
        right: 0.3rem;
        pointer-events: none;
      }
    }
    .solo {
      background-image: url(/img/bg-landing-page.svg);
      background-position: center;
      background-repeat: no-repeat;
      height: 16rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;

      button {
        height: 4rem;
      }

      .addLinkButton button {
        margin-top: 1.5rem;
        height: 2.5rem;
        font-size: 0.8rem;
        font-weight: 500;
      }

    }

    .notSolo {
      display: flex;
      justify-content: space-between;
      margin: 0 0.5rem;

      .createButton {
        margin-right: 0.5rem;
      }

      .addLinkButton {
        margin-left: 0.5rem;
      }
    }

    .addLinkButton button {
      color: var(--color-green);
      background: var(--color-white);
      border-color: var(--color-green);
    }
  }
`

module.exports = mainView

function mainView (state, emit) {
  emit('DOMTitleChange', 'Dat Shopping List 東京')
  const documents = state.documents.map(doc => {
    return html`
      <li onclick=${click} onkeydown=${keydown} tabindex="0" role="button">
        <span>${prettyHash(doc.key)}</span>
        <a href="/doc/${doc.key}" class="link" tabindex="-1">${doc.name}</a>
      </li>
    `
    function click (event) {
      const link = event.target.querySelector('a')
      if (link) link.click()
    }
    function keydown (event) {
      if (event.key === ' ' || event.key === 'Enter') {
        event.target.querySelector('a').click()
      }
    }
  })
  const docHeader = documents.length > 0 ? html`<h3>Shopping Lists</h3>` : null
  const soloCta = documents.length === 0 ? 'solo' : 'notSolo'
  return html`
    <body class=${prefix}>
      ${header(state)}
      <section class="content">
        <div class="uvp">
          <h4>Test drive multi-writer Dat!</h4>
          <p>
            This is a <b>Progressive Web App</b> built to demonstrate the use of the new 
            <b>multi-writer</b> capabilities from the 
            <a href="https://datproject.org/" class="link">Dat Project</a>.
          </p>
          <p>
            Make shopping lists and use them online or offline, and sync between multiple
            devices or users. Read the <a href="https://blog.datproject.org/2018/05/14/dat-shopping-list/"
            class="link" target="_blank">blog post!</a>
          </p>
        </p>
        <header>
          ${docHeader}
        </header>
        <ul>
          ${documents}
        </ul>
        <div class=${soloCta}>
          <div class="createButton">
            ${button.button('Create a new Shopping List', () => emit('pushState', '/create'))}
          </div>
          <div class="addLinkButton">
            ${button.button('Have a Link? Paste it Here', () => emit('pushState', '/add-link'))}
          </div>
        </div>
      </section>
      ${footer(state)}
    </body>
  `
}
