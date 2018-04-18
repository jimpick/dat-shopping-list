const html = require('choo/html')
const css = require('sheetify')
const header = require('../components/header')
const button = require('../components/button')

const prefix = css`
  :host {
    .content {
      margin: 1em;
    }
    input[type="text"] {
      width: 100%;
      font-size: 1.5rem;
    }
  }
`

module.exports = createView

function createView (state, emit) {
  return html`
    <body class=${prefix}>
      ${header()}
      <div class="content">
        <h2>
          Enter a name for your new shopping list
        </h2>
        <form onsubmit=${submit}>
          <input type="text" autocapitalize="off" autofocus>
          <p>
            ${button.submit('Submit')}
          </p>
        </form>
      </div>
    </body>
  `
  
  function submit (event) {
    const docName = event.target.querySelector('input').value
    if (docName) {
      emit('createDoc', docName)
    }    
    event.preventDefault()
  }
}