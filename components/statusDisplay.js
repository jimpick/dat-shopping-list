const path = require('path')
const html = require('choo/html')
const css = require('sheetify')
const SvgIcon = require('./svgIcon')

// Use browserify + brfs to convert these to inline strings
const fs = require('fs')
const syncIcon = fs.readFileSync(
  path.resolve(__dirname, '../static/img/ic_sync_black_24px.svg'),
  'utf8'
)
const syncIconDisabled = fs.readFileSync(
  path.resolve(__dirname, '../static/img/ic_sync_disabled_black_24px.svg'),
  'utf8'
)
const syncIconProblem = fs.readFileSync(
  path.resolve(__dirname, '../static/img/ic_sync_problem_black_24px.svg'),
  'utf8'
)

const prefix = css`
  :host {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    font-weight: 300;
    font-size: 0.8rem;

    @media only screen and (max-width : 350px) {
      font-size: 0.6rem;

      img {
        width: 0.7rem;
        height: 0.7rem;
      }
    }

    .online {
      color: var(--color-green);

      svg {
        fill: var(--color-green);
      }
    }

    .offline {
      color: var(--color-red);

      svg {
        fill: var(--color-red);
      }
    }

    .connecting {
      color: var(--color-yellow);

      svg {
        fill: var(--color-yellow);
      }
    }

    .online svg,
    .offline svg,
    .connecting svg {
      width: 1rem;
      height: 1rem;
      vertical-align: text-top;
    }

    img {
      width: 0.8rem;
      height: 0.8rem;
    }
  }
`

module.exports = statusDisplay

function statusDisplay (state) {
  if (!state) return null
  let networkStatus
  let connected
  let pendingUpload = state.localUploadLength - state.syncedUploadLength
  if (pendingUpload <= 0 || isNaN(pendingUpload)) pendingUpload = null
  if (pendingUpload) pendingUpload = html`<span>${pendingUpload}↑</span>`
  let pendingDownload = state.localDownloadLength - state.syncedDownloadLength
  if (pendingDownload <= 0 || isNaN(pendingDownload)) pendingDownload = null
  if (pendingDownload) pendingDownload = html`<span>${pendingDownload}↓</span>`
  if (state.networkStatus !== undefined) {
    const onlineOffline = state.networkStatus
      ? html`<span class="online">Online</span>`
      : html`<span class="offline">Offline</span>`
    networkStatus = html`
      <div class="networkStatus">
        Network: ${onlineOffline}
      </div>
    `
  }
  if (state.connected !== undefined) {
    if (state.connecting) {
      connected = html`
        <span class="connecting">
          ${state.cache(SvgIcon, 'sync').render(syncIcon)}
          ${pendingDownload}
          ${pendingUpload}
        </span>
      `
    } else if (state.connected) {
      connected = html`
        <span class="online">
          ${state.cache(SvgIcon, 'sync').render(syncIcon)}
          ${pendingDownload}
          ${pendingUpload}
        </span>
      `
    } else {
      if (state.networkStatus) {
        connected = html`
          <span class="offline">
            ${state.cache(SvgIcon, 'syncProblem').render(syncIconProblem)}
            ${pendingDownload}
            ${pendingUpload}
          </span>
        `
      } else {
        connected = html`
          <span class="offline">
            ${state.cache(SvgIcon, 'syncDisabled').render(syncIconDisabled)}
            ${pendingDownload}
            ${pendingUpload}
          </span>
        `
      }
    }
    connected = html`
      <div class="connected">
        Sync: ${connected}
      </div>
    `
  }
  let serviceWorker = state.serviceWorker ? html`<div>Worker Ready</div>` : null
  let devLabel = state.devMode ? html`<div>Label: ${state.devLabel}</div>` : null
  return html`
    <div class=${prefix}>
      ${networkStatus}
      ${connected}
      ${serviceWorker}
      ${devLabel}
    </div>
  `
}
