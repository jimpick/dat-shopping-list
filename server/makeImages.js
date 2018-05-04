const gm = require('gm').subClass({imageMagick: true})

module.exports = makeImages

function makeImages (cb) {
  console.log('Making images')
  makePngFromSvg('dat-shopping', 16)
    .then(makePngFromSvg('dat-shopping', 32))
    .then(makePngFromSvg('dat-shopping', 96))
    .then(makePngFromSvg('dat-shopping', 120))
    .then(makePngFromSvg('dat-shopping', 152))
    .then(makePngFromSvg('dat-shopping', 167))
    .then(makePngFromSvg('dat-shopping', 180))
    .then(makePngFromSvg('dat-shopping', 192))
    .then(makePngFromSvg('dat-shopping', 196))
    .then(makePngFromSvg('dat-shopping', 512))
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
