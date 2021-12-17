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
  emit('DOMTitleChange', 'Dat Shopping List - Create')
  const input = html`<input type="text" autofocus>`
  input.isSameNode = function (target) {
    return (target && target.nodeName && target.nodeName === 'INPUT')
  }

  return html`
    <body class=${prefix}>
      ${header(state)}
      <div class="content">
        <h2>
          Enter a name for your new shopping list
        </h2>
        <form onsubmit=${submit}>
          ${input}
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
      const textInput = event.target.querySelector('input[type="text"]')
      textInput.setAttribute('disabled', 'disabled')
      const submitButton = event.target.querySelector('input[type="submit"]')
      submitButton.setAttribute('disabled', 'disabled')
      emit('createDoc', docName)
    }
    event.preventDefault()
  }
}
