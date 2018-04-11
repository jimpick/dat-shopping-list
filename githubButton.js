const Component = require('choo/component')
const html = require('choo/html')

module.exports = repo => {
  class GitHubButton extends Component {
    constructor () {
      super()
      this.loaded = false
    }

    createElement () {
      return html`<div><a class="github-button"
            href="https://github.com/${repo}"
            data-icon="octicon-star"
            data-size="large"
            data-show-count="true"
            aria-label="Star ${repo} on GitHub">
            Star
          </a></div>
      `
    }

    load () {
      if (this.loaded) return
      setTimeout(() => {
        const scriptTag = html`<script async defer src="https://buttons.github.io/buttons.js"></script>`
        document.querySelector('head').appendChild(scriptTag)
      }, 1000)
    }

    update () {
      return false
    }
  }
  return GitHubButton
}
