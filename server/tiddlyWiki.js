const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const tiddlywikiBoot = require('tiddlywiki/boot/boot')

// See: https://gist.github.com/Arlen22/bbd852f68e328165e49f

/*
process.env['TIDDLYWIKI_THEME_PATH'] = path.resolve(
  __dirname, '..', 'tiddlywiki', 'themes'
)
process.env['TIDDLYWIKI_PLUGIN_PATH'] = path.resolve(
  __dirname, '..', 'tiddlywiki', 'plugins'
)
*/

const wikis = {}

function getWiki(key) {
  if (wikis[key]) return wikis[key]
  // const wikiPath = path.join('.data', 'wikis', key)
  // mkdirp.sync(wikiPath)
  // const tiddlyInfo = fs.readFileSync('tiddlywiki/tiddlywiki.info')
  // fs.writeFileSync(path.join(wikiPath, 'tiddlywiki.info'), tiddlyInfo)
  $tw = tiddlywikiBoot.TiddlyWiki()
  // $tw.boot.argv = [wikiPath]
  $tw.boot.argv = ['tiddlywiki']
  $tw.boot.boot()
  /*
  $tw.wiki.addTiddler({
    text: `$protocol$//$host$/doc/${key}/tw/`,
    title: '$:/config/tiddlyweb/host'
  })
  */
  const serverCommand = $tw.modules.execute(
    'tiddlywiki/core/modules/commands/server.js'
  ).Command
  const command = new serverCommand([], {wiki: $tw.wiki})
  const server = command.server
  server.set({
    rootTiddler: "$:/core/save/all",
    renderType: "text/plain",
    serveType: "text/html",
    username: "",
    password: "",
    pathPrefix: `/doc/${key}/tw/`
  })
  const requestHandler = server.requestHandler.bind(server)
  wikis[key] = {
    command,
    requestHandler
  }
  return wikis[key]
}

function tiddlyWikiRequest (req, res, next) {
  const wiki = getWiki(req.params.key)
  req.url = req.url.replace(/^.*\/tw\/?/, '/')
  wiki.requestHandler(req, res, next)
}

module.exports = tiddlyWikiRequest
