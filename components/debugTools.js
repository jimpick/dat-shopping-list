const html = require('choo/html')
const css = require('sheetify')

module.exports = debugTools

const prefix = css`
  :host {
    margin: 2rem;
  }
`

function debugTools (state, emit) {
  if (!state.devMode) return null
  return html`
    <div class=${prefix}>
      Debug tools: ${' '}
      <a href="#" class="link" onclick=${downloadZip}>Download Zip</a>
    </div>
  `

  function downloadZip (event) {
    emit('downloadZip')
    event.preventDefault()
  }
}
