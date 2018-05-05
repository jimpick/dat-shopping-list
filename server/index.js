#!/usr/bin/env node

const budo = require('budo')
const express = require('express')
const compression = require('compression')
const hsts = require('hsts')
const csp = require('helmet-csp')
const mkdirp = require('mkdirp')
const dbGateway = require('./dbGateway')
const serviceWorkerNoCache = require('./middleware/serviceWorkerNoCache')
const redirectToHttps = require('./middleware/redirectToHttps')
const makeServiceWorker = require('./makeServiceWorker')
const makeImages = require('./makeImages')
const periodicRestart = require('./periodicRestart')

require('events').prototype._maxListeners = 100

const router = express.Router()

function serveIndex (req, res, next) {
  req.url = '/index.html'
  next()
}

router.get('/create', serveIndex)
router.get('/add-link', serveIndex)
router.get('/doc/:key', serveIndex)

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
      csp({
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'https://cdn.glitch.com'],
          connectSrc: [
            'https://api.github.com',
            (req, res) => {
              // Glitch has a proxy
              const xfpHeader = req.headers['x-forwarded-proto']
              if (!xfpHeader || !xfpHeader.match(/^https/)) {
                return 'ws://' + req.headers['host']
              } else {
                return 'wss://' + req.headers['host']
              }
            }
          ],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"]
        }
      }),
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
    periodicRestart(60) // Hourly
  })
}

mkdirp.sync('.data/img')

makeServiceWorker(err => {
  if (err) {
    console.error(err)
    throw err
  }
  makeImages(err => {
    if (err) {
      console.error(err)
      throw err
    }
    runBudo()
  })
})
