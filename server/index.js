#!/usr/bin/env node

const path = require('path')
const budo = require('budo')
const express = require('express')
const compression = require('compression')
const hsts = require('hsts')
const mkdirp = require('mkdirp')
const dbGateway = require('./dbGateway')
const serviceWorkerNoCache = require('./middleware/serviceWorkerNoCache')
const redirectToHttps = require('./middleware/redirectToHttps')
const csp = require('./middleware/csp')
const makeServiceWorker = require('./makeServiceWorker')
const makeImages = require('./makeImages')
const makeTiddlyWikiPlugins = require('./makeTiddlyWikiPlugins')
const periodicRestart = require('./periodicRestart')
const tiddlyWiki = require('./tiddlyWiki')

require('events').prototype._maxListeners = 100

process.chdir(path.resolve(__dirname, '..'))

const router = express.Router()

function serveIndex (req, res, next) {
  req.url = '/'
  next()
}

router.get('/', csp, serveIndex)
router.get('/index.html', csp, serveIndex)
router.get('/create', csp, serveIndex)
router.get('/add-link', csp, serveIndex)
router.all('/doc/:key/tw*', tiddlyWiki)
router.get('/doc/:key', csp, serveIndex)

const attachWebsocket = dbGateway(router)

function runBudo () {
  const port = process.env.PORT || 5000
  const devServer = budo('index.js', {
    port,
    browserify: {
      transform: [
        'brfs',
        ['sheetify', {transform: ['sheetify-nested']}]
      ]
    },
    middleware: [
      hsts({maxAge: 10886400}),
      compression(),
      serviceWorkerNoCache,
      redirectToHttps,
      express.static('img'),
      router
    ],
    dir: ['.', 'static', '.data'],
    staticOptions: {
      cacheControl: true,
      maxAge: 60 * 60 * 1000 // one hour
    }
    /*
    stream: process.stdout,
    verbose: true
    */
  })
  devServer.on('connect', event => {
    console.log('Listening on', event.uri)
    attachWebsocket(event.server)
    periodicRestart(24 * 60) // Daily
  })
}

mkdirp.sync('.data/img')

makeServiceWorker(err => {
  checkError(err)
  makeImages(err => {
    checkError(err)
    makeTiddlyWikiPlugins(err => {
      checkError(err)
      runBudo()
    })
  })
})

function checkError (err) {
  if (err) {
    console.error(err)
    throw err
  }
}