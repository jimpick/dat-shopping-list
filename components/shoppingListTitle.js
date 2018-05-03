const html = require('choo/html')
const css = require('sheetify')
const copy = require('clipboard-copy')
const prettyHash = require('pretty-hash')
const customAlert = require('./customAlert')

module.exports = title

const prefix = css`
  :host {
    position: relative;
    h1 {
      margin: 0 0 0.5em 0;
    }
    .hash {
      font-size: 12px;
      font-family: monospace;
      position: absolute;
      top: -0.6rem;
      right: 0;
      cursor: pointer;
    }
  }
`

function title (state, emit) {
  return html`
    <div class=${prefix}>
      <h1>${state.docTitle}</h1>
      <div class="hash" onclick=${copyUrl} onkeydown=${keydown} tabindex="0">
        ${prettyHash(state.key)}
      </div>
    </div>
  `

  function copyUrl (event) {
    copy(document.location.href).then(() => {
      customAlert.show('Shopping list URL copied to clipboard')
    })
  }

  function keydown (event) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.target.click()
    }
  }
}
