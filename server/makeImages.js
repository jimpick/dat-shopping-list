const svgexport = require('svgexport')

module.exports = makeImages

function makeImages (cb) {
  console.log('Making images')
  const base = 'dat-shopping-list'
  const sizes = [16, 32, 96, 120, 152, 167, 180, 192, 196, 512]

  svgexport.render({
    input: [ `./static/img/${base}.svg` ],
    output: sizes.map(size => [
      `./.data/img/${base}-${size}.png`,
      `${size}:`
    ]),
    cwd: process.cwd()
  }, cb)
}
