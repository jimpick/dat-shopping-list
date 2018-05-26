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
      <a href="#" class="link" onclick=${unregisterServiceWorker}>Unregister Service Worker</a>
    </div>
  `

  function downloadZip (event) {
    emit('downloadZip')
    event.preventDefault()
  }
  
  function unregisterServiceWorker (event) {
    if (navigator.serviceWorker) {
      navigator.serverWorker.getRegistrations()
        .then(registrations => {
          if (registrations && registrations[0]) {
            registrations[0].unregister()
              .then(() => alert('Unregistered'))
          }
        })
    }
    event.preventDefault()
  }
}
