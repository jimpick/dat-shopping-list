const Component = require('choo/component')
const html = require('choo/html')
const raw = require('choo/html/raw')
const css = require('sheetify')

// CSS and HTML based on http://buttons.github.io/

const prefix = css`
  :host {
    margin: 0;
    font-size: 0;
    white-space: nowrap;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    user-select: none;
    width: 100px;
    height: 28px;
    border: none;

    .btn {
      padding: 0 10px;
      font-size: 12px;
      background-color: #eff3f6;
      background-image: linear-gradient(to bottom, #fafbfc, #e4ebf0);
      background-repeat: repeat-x;
      background-size: 110% 110%;

      &:active {
        background-color: #e9ecef;
        background-image: none;
        border-color: #afb1b2;
        box-shadow: inset 0 0.15em 0.3em rgba(27,31,35,0.15);
      }

      &:hover {
        background-color: #e6ebf1;
        background-image: linear-gradient(to bottom, #f0f3f6, #dce3ec);
        border-color: #afb1b2;
      }

      span {
        vertical-align: 0;
      }
    }

    .social-count {
      padding: 0 7px;
      margin-left: 7px;
      font-size: 11px;
      position: relative;
      background-color: #fff;

      b {
        margin-right: 0;
        border-right-color: #d1d2d3 !important;
      }

      i {
        margin-right: -1.5px;
        border-right-color: #fff !important;
      }

      b, i {
        margin-top: -6px;
        position: absolute;
        top: 50%;
        right: 100%;
        display: block;
        width: 0;
        height: 0;
        border: 6px solid transparent;
      }

      span {
        vertical-align: 0;
      }

      &:hover {
        color: #0366d6;
      }
    }

    .btn, .social-count {
      height: 26px;
      line-height: 26px;
      display: inline-block;
      font-weight: 600;
      vertical-align: middle;
      cursor: pointer;
      border: 1px solid #d1d2d3;
      border-radius: 0.25em;

      &:focus {
        border-color: #c8e1ff;
      }
    }

    a {
      color: #24292e;
      text-decoration: none;
      outline: 0;
    }

    .octicon {
      height: 16px;
      top: 4px;
      position: relative;
      display: inline-block;
      fill: currentColor;
    }
  }
`

class GitHubButton extends Component {
  constructor (id, state, emit, repo) {
    super()
    this.loaded = false
    this.repo = repo
    this.stargazersCount = null
  }

  createElement () {
    const {repo} = this
    const svg = raw(`
      <svg version="1.1" width="14" height="16" viewBox="0 0 14 16" class="octicon octicon-star" aria-hidden="true">
        <path fill-rule="evenodd" d="M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74L14 6z"></path>
      </svg>
    `)
    return html`
      <div class=${prefix}>
        <a href="https://github.com/${repo}"
          class="btn"
          aria-label="Star ${repo} on GitHub"
        >
          ${svg}
          <span>Star</span>
        </a>
      </div>
    `
  }

  load (el) {
    const url = `https://api.github.com/repos/${this.repo}`
    window.fetch(url)
      .then(res => res.json())
      .then(({stargazers_count: stargazersCount}) => {
        this.stargazersCount = stargazersCount
        const linkEl = this.stargazersLink()
        el.appendChild(linkEl)
      })
  }

  stargazersLink () {
    const {repo, stargazersCount} = this
    return html`
      <a href="https://github.com/${repo}/stargazers"
        class="social-count"
        aria-label="${stargazersCount} stargazers on GitHub"
      >
        <b></b><i></i><span>${stargazersCount}</span>
      </a>
    `
  }

  update () {
    return false
  }
}

module.exports = GitHubButton
