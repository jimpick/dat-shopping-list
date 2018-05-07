const sharp = require('sharp')

module.exports = makeImages

function makeImages (cb) {
  console.log('Making images')
  const base = 'dat-shopping-list'
  const sizes = [16, 32, 96, 120, 152, 167, 180, 192, 196, 512]

  sizes.reduce(
    (promise, size) => {
      console.log('Making png', base, size)
      return promise
        .then(() => {
          return sharp(`./static/img/${base}.svg`)
            .resize(size, size)
            .background('white')
            .flatten()
            .toFile(`./.data/img/${base}-${size}.png`)
        })
    },
    Promise.resolve()
  ).then(() => cb())
  .catch(err => { console.error('Error', err) })
}
