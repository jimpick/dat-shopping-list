const Component = require('choo/component')
const html = require('choo/html')

class GitHubButton extends Component {
  constructor (id, state, emit, repo) {
    super()
    this.loaded = false
    this.repo = repo
  }

  createElement () {
    return html`<div><a class="github-button"
          href="https://github.com/${this.repo}"
          data-icon="octicon-star"
          data-size="large"
          data-show-count="true"
          aria-label="Star ${this.repo} on GitHub">
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

module.exports = GitHubButton
