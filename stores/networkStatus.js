module.exports = store

function store (state, emitter) {
  updateOnlineStatus()
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)

  function updateOnlineStatus () {
    state.networkStatus = navigator.onLine
    emitter.emit('render')
  }
}
