const html = require('choo/html')
const css = require('sheetify')

const prefix = css`
  :host {
    color: var(--color-white);
    background-color: var(--color-green);
    font-size: 1rem;
    font-weight: 700;
    text-decoration: none;
    padding: 0.5rem 1rem;
    display: inline-block;
    backface-visibility: hidden;
    transform: translateZ(0);
    transition: transform .25s ease-out,-webkit-transform .25s ease-out;
    border-color: transparent;
    &:active {
      transform: scale(0.9);
    }
    &:focus, &:hover {
      transform: scale(1.05);
    }
    -webkit-appearance: none;
    -moz-appearance: none;
    border-radius: 0;
    cursor: pointer;
    &::-moz-focus-inner { 
      border: 0; 
    }
  }
`

module.exports = {
  button,
  submit
}

function button (label, onclick) {
  return html`
    <button class=${prefix} onclick=${onclick}>
      ${label}
    </button>
  `
}

function submit (label, onclick) {
  return html`
    <input type="submit" class=${prefix} onclick=${onclick} value=${label}>
  `
}
