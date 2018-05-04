const gm = require('gm').subClass({imageMagick: true})

module.exports = makeImages

function makeImages (cb) {
  console.log('Making images')
  const base = 'dat-shopping-list'
  makePngFromSvg(base, 16)
    .then(makePngFromSvg(base, 32))
    .then(makePngFromSvg(base, 96))
    .then(makePngFromSvg(base, 120))
    .then(makePngFromSvg(base, 152))
    .then(makePngFromSvg(base, 167))
    .then(makePngFromSvg(base, 180))
    .then(makePngFromSvg(base, 192))
    .then(makePngFromSvg(base, 196))
    .then(makePngFromSvg(base, 512))
    .then(cb)
    .catch(cb)
}

function makePngFromSvg (name, size) {
  const promise = new Promise((resolve, reject) => {
    gm(`./static/img/${name}.svg`)
      .resize(size, size)
      .write(`./.data/img/${name}-${size}.png`, err => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
  })
  return promise
}
