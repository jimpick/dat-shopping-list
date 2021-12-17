const html = require('choo/html')
const css = require('sheetify')
const statusDisplay = require('./statusDisplay')

const prefix = css`
  :host {
    border-bottom: 1px solid var(--color-neutral-10);
    flex: 0 64px;
    color: var(--color-neutral);
    font-weight: 700;
    font-size: 1.5rem;
    display: flex;
    padding-left: 1rem;
    padding-right: 1rem;
    position: relative;
    a {
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: opacity .15s ease-in;
      &:hover, &:focus {
        opacity: 0.5;
      }
      img {
        width: 2rem;
        height: 2rem;
        margin-right: 0.5rem;
        transition: transform .5s ease-in-out;
        &:hover, &:focus {
          transform: rotate(360deg);
        }
      }
    }
    .title {
      color: var(--color-neutral-60);
      white-space: nowrap;
    }
    .first-word {
      color: var(--color-neutral);
    }
  }
`

module.exports = header

function header (state) {
  return html`
    <nav class=${prefix}>
      <a href="/">
        <img src="/img/dat-hexagon.svg" alt="Dat Project Logo">
        <span class="title">
          <span class="first-word">Dat</span> Shopping List 東京
        </span>
      </a>
      ${statusDisplay(state)}
    </nav>
  `
}
