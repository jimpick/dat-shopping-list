const Component = require('choo/component')
const html = require('choo/html')
const css = require('sheetify')
const focusTrap = require('focus-trap')
const { button } = require('./button')

const prefix = css`
  :host {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    visibility: hidden;
    opacity: 0;
    transition: opacity 0.3s;

    &.show {
      visibility: visible;
      opacity: 1;

      .alertContent {
        transform: scale(1);
        opacity: 1;
      }
    }

    .alertContent {
      background: white;
      border: 1px solid black;
      padding: 3rem;
      margin: 3rem;
      font-size: 1.5rem;
      transform: scale(0.7);
      opacity: 0;
      transition: all 0.3s;
      border-radius: 0.5rem;

      button {
        margin: 2rem 0 0 0;
        width: 100%;
        font-size: 1.2rem;
        padding: 1rem;
      }
    }

  }
`

module.exports = {
  alertBox,
  show
}

const local = {
  emit: null,
  display: false,
  message: '',
  cb: null
}

class Alert extends Component {
  constructor () {
    super()
    this.message = ''
    this.display = false
    this.close = this.close.bind(this)
  }

  createElement (message, display, cb) {
    this.message = message
    this.display = display
    this.cb = cb
    const show = display ? 'show' : ''
    if (this.focusTrap) {
      if (display) {
        setTimeout(this.focusTrap.activate, 100) // Let animation start
      } else {
        this.focusTrap.deactivate()
      }
    }
    return html`
      <div class="${prefix} ${show}" onclick=${this.close}>
        <div class="alertContent">
          <div>
            ${message}
          </div>
          ${button('OK', this.close)}
        </div>
      </div>
    `
  }

  load (el) {
    this.focusTrap = focusTrap(el)
    if (this.display) this.focusTrap.activate()
  }

  unload (el) {
    this.focusTrap = null
  }

  update (message, display, cb) {
    this.cb = cb
    return message !== this.message || display !== this.display
  }

  close (event) {
    event.stopPropagation()
    if (this.cb) this.cb()
  }
}

function alertBox (state, emit) {
  local.emit = emit
  return state.cache(Alert, 'alert').render(local.message, local.display, close)
  function close () {
    local.display = false
    emit('render')
    if (local.cb) local.cb()
  }
}

function show (message, cb) {
  Object.assign(local, {display: true, message, cb})
  window.scroll({top: 0})
  local.emit('render')
}
