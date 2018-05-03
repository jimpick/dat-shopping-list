const gm = require('gm').subClass({imageMagick: true})

module.exports = makeImages

function makeImages (cb) {
  console.log('Making images')
  makePngFromSvg('dat-hexagon', 16)
    .then(makePngFromSvg('dat-hexagon', 32))
    .then(makePngFromSvg('dat-hexagon', 96))
    .then(makePngFromSvg('dat-hexagon', 120))
    .then(makePngFromSvg('dat-hexagon', 152))
    .then(makePngFromSvg('dat-hexagon', 167))
    .then(makePngFromSvg('dat-hexagon', 180))
    .then(makePngFromSvg('dat-hexagon', 192))
    .then(makePngFromSvg('dat-hexagon', 196))
    .then(makePngFromSvg('dat-hexagon', 512))
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
