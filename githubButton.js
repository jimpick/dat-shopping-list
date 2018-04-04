const Nanocomponent = require('nanocomponent')
const html = require('choo/html')

class GitHubButton extends Nanocomponent {
  constructor () {
    super()
    this.loaded = false
  }

  createElement () {
    return html`<div><a class="github-button"
          href="https://github.com/jimpick/dat-multiwriter-web"
          data-icon="octicon-star"
          data-size="large"
          data-show-count="true"
          aria-label="Star jimpick/dat-multiwriter-web on GitHub">
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

  // Implement conditional rendering
  update () {
    return false
  }
}

module.exports = GitHubButton
