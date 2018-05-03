// Restart after an interval so that the demo doesn't seed content forever
// Active clients should re-connect

module.exports = periodicRestart

function periodicRestart (intervalMinutes) {
  setTimeout(() => {
    console.log(`Planned periodic restart after ${intervalMinutes} minutes.`)
    process.exit(0)
  }, intervalMinutes * 60 * 1000)
}
