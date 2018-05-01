const Component = require('choo/component')
const raw = require('choo/html/raw')
const html = require('choo/html')

class SvgIcon extends Component {
  constructor () {
    super()
    this.svgData = null
  }

  createElement (data) {
    this.svgData = data
    return html`<span>${raw(data)}</span>`
  }

  update () {
    return false
  }
}

module.exports = SvgIcon
