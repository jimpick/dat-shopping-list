const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const browserify = require('browserify')

module.exports = makeTiddlyWikiPlugins

function makeTiddlyWikiPlugins (cb) {
  console.log('Making TiddlyWiki plugins')
  const dest = path.join('.data', 'tiddlywiki-plugins', 'hyperdrive')
  mkdirp.sync(dest)
  const filename = 'hyperdriveadaptor.js'
  const output = fs.createWriteStream(path.join(dest, filename))
  browserify({
    entries: [path.join('tiddlywiki', 'plugins', 'hyperdrive', filename)],
    standalone: 'hyperdriveadaptor',
    cache: {},
    packageCache: {}
  })
  .on('error', err => {
    console.error('browserify error', err)
    process.exit(1)
  })
  .bundle()
  .pipe(output)
  output.on('finish', () => {
    console.log('Done')
    cb()
  })
}