const html = require('choo/html')
const css = require('sheetify')
const header = require('../components/header')
const button = require('../components/button')
const customAlert = require('../components/customAlert')

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

module.exports = addLinkView

function addLinkView (state, emit) {
  emit('DOMTitleChange', 'Dat Shopping List - Add Link')
  const input = html`<input type="text" autofocus spellcheck="false">`
  input.isSameNode = function (target) {
    return (target && target.nodeName && target.nodeName === 'INPUT')
  }

  return html`
    <body class=${prefix}>
      ${header(state)}
      <div class="content">
        <h2>
          Paste in a URL link or a hexadecimal key
        </h2>
        <form onsubmit=${submit}>
          ${input}
          <p>
            ${button.submit('Submit')}
          </p>
        </form>
      </div>
      ${customAlert.alertBox(state, emit)}
    </body>
  `

  function submit (event) {
    const link = event.target.querySelector('input').value
    if (link) {
      const textInput = event.target.querySelector('input[type="text"]')
      textInput.setAttribute('disabled', 'disabled')
      const submitButton = event.target.querySelector('input[type="submit"]')
      submitButton.setAttribute('disabled', 'disabled')
      emit('addLink', link)
    }
    event.preventDefault()
  }
}
