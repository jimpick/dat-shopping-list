const html = require('choo/html')

module.exports = createView

function createView (state, emit) {
  return html`
    <body>
      <h2>
        Enter name for your new document
      </h2>
      <form onsubmit=${submit}>
        <input type="text">
        <input type="submit">
      </form>
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