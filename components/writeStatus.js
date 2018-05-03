const html = require('choo/html')
const raw = require('choo/html/raw')
const css = require('sheetify')
const copy = require('clipboard-copy')
const customAlert = require('./customAlert')
const button = require('./button')

module.exports = writeStatus

const prefix = css`
  :host {
    box-shadow: 0 0 10px rgba(0,0,0,.15);
    padding: 0.7rem;
    position: relative;
    -webkit-tap-highlight-color: transparent;

    .collapseExpand {
      position: absolute;
      top: -0.8rem;
      right: 0.6rem;
      z-index: 1;
      font-size: 0.8rem;
      cursor: pointer;
      color: var(--color-green);
      background: var(--color-white);
      border: 2px solid var(--color-neutral-10);
      border-radius: 0.8rem;
      width: 5rem;
      height: 1.4rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .noAuth {
      color: var(--color-red);
      font-weight: 700;
    }

    .okAuth {
      color: var(--color-green);
      font-weight: 700;
    }

    .help {
      font-size: 0.8rem;
      font-weight: 500;
      margin-left: 0.5rem;
      margin-right: 0.5rem;
    }

    .localKeySection {
      -webkit-tap-highlight-color: black;
      background: var(--color-neutral-10);
      padding: 0.5rem;

      .noWrap {
        white-space: nowrap;
        display: flex;

        .localKey {
          color: var(--color-blue-darker);
          text-overflow: ellipsis;
          overflow: hidden;
        }
      }

      @media only screen and (min-device-width : 500px) and (max-device-width : 600px) {
        .localKey {
          font-size: 12px;
        }
      }

      @media only screen and (min-device-width : 400px) and (max-device-width : 500px) {
        .localKey {
          font-size: 10px;
        }
      }

      @media only screen and (max-width : 400px) {
        .localKey {
          font-size: 8px;
        }
      }

      button {
        font-size: 0.7rem;
        padding: 0.5rem 0.5rem;
        font-weight: 400;
        margin-right: 1rem;
      }
    }

    form {
      margin: 0;

      .writerInputs {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        font-size: 16px;

        div {
          margin-right: 0.4rem;
        }

        input[type="text"] {
          font-size: 16px;
          flex: 1;
          margin-right: 0.4rem;
        }

        input[type="submit"] {
          font-size: 16px;
          padding: 0.1rem 0.5rem;
          font-weight: 400;
        }
      }
    }
  }
`

function writeStatus (state, emit) {
  const db = state.archive && state.archive.db
  if (!db) return null
  const localKey = db.local.key.toString('hex')
  let sourceCopy = null
  if (!state.writeStatusCollapsed) {
    sourceCopy = db.local === db.source
      ? 'You created this document.'
      : 'You joined this document.'
  }
  let authStatus = null
  if (state.authorized) {
    if (state.writeStatusCollapsed) {
      authStatus = html`<div><span class="okAuth">Authorized</span> (Expand to add a writer)</div>`
    } else {
      authStatus = html`<div class="okAuth">You are authorized to write to this document.</div>`
    }
  } else {
    let explanationAndLocalKey = null
    if (!state.writeStatusCollapsed) {
      explanationAndLocalKey = html`
        <div>
          <p class="help">
            You may edit your local copy, but changes will not be synchronized until you
            pass your "local key" to an owner of the document and they authorize you.
          </p>
          <div class="localKeySection" onclick=${e => e.stopPropagation()}>
            Your local key is:
            <div class="noWrap">
              <span class="localKey">${localKey}</span>
            </div>
            ${button.button('Copy to Clipboard', copyToClipboard)}
            ${state.localKeyCopied ? 'Copied!' : null}
          </div>
        </div>
      `
    }
    let noAuth
    if (!state.writeStatusCollapsed) {
      noAuth = html`<div class="noAuth">
        You are not currently authorized to write to this document.
      </div>`
    } else {
      noAuth = html`<div>
        <span class="noAuth">Not authorized</span>
        (Expand for more info)
      </div>`
    }
    authStatus = html`<div>
      ${noAuth}
      ${explanationAndLocalKey}
    </div>`
  }
  let authForm = null
  if (!state.writeStatusCollapsed && state.authorized) {
    const localKeyInput = html`
      <input type="text" placeholder="Writer Local Key" spellcheck="false">
    `
    localKeyInput.isSameNode = function (target) {
      return (target && target.nodeName && target.nodeName === 'INPUT')
    }
    authForm = html`
      <form onsubmit=${submit}>
        <p class="help">
          You can share this shopping list to multiple devices or other
          people. Just copy the URL and paste it into another browser.
          (Hint: You can click
          on the "hex number" on the upper right to copy the URL to your
          clipboard). Other copies may write to this document if you
          authorize them by pasting their 'local key' into the form below.
        </p>
        <div class="writerInputs" onclick=${e => e.stopPropagation()}>
          <div>Add a writer:</div> 
          ${localKeyInput}
          ${button.submit('Authorize')}
        </div>
      </form>
    `
  }
  const collapseExpand = state.writeStatusCollapsed
    ? raw('&#x25bc; Expand') : raw('&#x25b2; Collapse')
  return html`
    <section class=${prefix} onclick=${() => emit('toggleWriteStatusCollapsed')}>
      <div class="collapseExpand" onkeydown=${keydown} tabindex="0">
        ${collapseExpand}
      </div>
      <div>${sourceCopy}</div>
      ${authStatus}
      ${authForm}
    </section>
  `

  function copyToClipboard () {
    copy(localKey).then(() => {
      customAlert.show('"Local Key" copied to clipboard')
      state.localKeyCopied = true
      emit('render')
    })
  }

  function submit (event) {
    const input = event.target.querySelector('input')
    const writerKey = input.value.trim()
    if (writerKey !== '') {
      emit('authorize', writerKey)
      input.value = ''
    }
    event.preventDefault()
  }
}

function keydown (event) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.target.click()
  }
}
