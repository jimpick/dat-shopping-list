const path = require('path')
const rai = require('random-access-idb')
// const hyperdrive = require('hyperdrive')
const hyperdrive = require('@jimpick/hyperdrive-hyperdb-backend')
const Automerge = require('automerge')
const equal = require('deep-equal')
const jsdiff = require('diff')
const connectToGateway = require('../../../lib/websocketGateway')
const dumpWriters = require('../../../lib/dumpWriters')

if ($tw.node) return // Client-side only for now

exports.adaptorClass = HyperdriveAdaptor

function HyperdriveAdaptor (options) {
  this.wiki = options.wiki
  this.logger = new $tw.utils.Logger("hyperdrive", {colour: "blue"})
  const match = document.location.pathname.match(/^\/doc\/([0-9a-f]+)\/tw/)
  if (!match) {
    throw new Error('Could not match key in url')
  }
  const keyHex = match[1]
  const storage = rai(`doc-${keyHex}`)
  this.archive = hyperdrive(storage, keyHex)
  this.ready = false
  this.synced = false
  this.archive.ready(() => {
    this.ready = true
    this.actorKey = this.archive.db.local.key.toString('hex')
    dumpWriters(this.archive)
    connectToGateway(this.archive)
    this.archive.db.watch(() => {
      console.log('Archive updated:', this.archive.key.toString('hex'))
      dumpWriters(this.archive)
      $tw.syncer.syncFromServer()
    })
  })
  this.tiddlerDocs = {}
}

HyperdriveAdaptor.prototype.name = "hyperdrive"

HyperdriveAdaptor.prototype.isReady = function() {
  return this.ready
}

HyperdriveAdaptor.prototype.getTiddlerInfo = function (tiddler) {
  return {}
}

/*
Get an array of skinny tiddler fields from the archive
*/

HyperdriveAdaptor.prototype.getSkinnyTiddlers = function (cb) {
  this.archive.ready(() => {
    this.archive.readdir('tiddlers', (err, list) => {
      if (err) return cb(err)
      const loadTiddlers = list.reverse().reduce(
        (cb, filepath) => {
          return (err, result) => {
            if (err) return cb(err)
            this.loadTiddlerDocMetadata(filepath, (err, metadata) => {
              if (err) return cb(err)
              if (!metadata) return cb(null, result)
              cb(null, [...result, metadata])
            })
          }
        },
        (err, result) => {
          if (err) return cb(err)
          if (!this.synced) {
            this.synced = true
            if (result.length === 0) {
              $tw.wiki.addTiddler({
                title: '$:/DefaultTiddlers',
                text: 'GettingStarted'
              })
            }
            setTimeout(() => {
              $tw.rootWidget.dispatchEvent({type: 'tm-home'})
            }, 1000)
          }
          cb(null, result)
        }
      )
      loadTiddlers(null, [])
    })
  })
}

HyperdriveAdaptor.prototype.loadTiddlerDocMetadata = function (filepath, cb) {
  const tiddlerDoc = this.getTiddlerDoc(filepath)
  const metadataDir = path.join('tiddlers', filepath, 'metadata')
  this.archive.readdir(metadataDir, (err, list) => {
    if (err) return cb(err)
    const changes = list
      .map(filename => {
        const match = filename.match(/^([0-9a-f]+)\.(\d+)\.json$/)
        if (!match) return {}
        return {
          filename,
          actorKey: match[1],
          seq: Number(match[2])
        }
      })
      .filter(({actorKey, seq}) => {
        if (!actorKey) return false
        if (!tiddlerDoc.metadataLast[actorKey]) return true
        if (seq <= tiddlerDoc.metadataLast[actorKey]) return false
        return true
      })
      .sort((a, b) => a.seq - b.seq || a.actorKey < b.actorKey)
    const loadMetadata = changes.reverse().reduce(
      (cb, change) => {
        return (err, result) => {
          if (err) return cb(err)
          const {actorKey, seq, filename} = change
          if (!tiddlerDoc.metadataLast[actorKey]) {
            tiddlerDoc.metadataLast[actorKey] = 0
          }
          if (tiddlerDoc.metadataLast[actorKey] != seq - 1) {
            // Skip if there are holes in the sequence
            console.error('Skipping', filepath, actorKey, seq,
              'wanted', tiddlerDoc.metadataLast[actorKey] + 1)
            return cb(null, result)
          }
          const fullPath = path.join(metadataDir, filename)
          this.archive.readFile(fullPath, 'utf-8', (err, data) => {
            if (err) return cb(err)
            try {
              const changeRecord = JSON.parse(data)
              changeRecord.actor = actorKey
              changeRecord.seq = seq
              tiddlerDoc.metadataLast[actorKey]++
              cb(null, [...result, changeRecord])
            } catch (e) {
              console.error('JSON parse error', e)
              return cb(new Error('JSON parse error'))
            }
          })
        }
      },
      (err, result) => {
        if (err) return cb(err)
        tiddlerDoc.metadataDoc = Automerge.applyChanges(
          tiddlerDoc.metadataDoc,
          result
        )
        const fields = {...tiddlerDoc.metadataDoc.fields}
        for (let propName in fields) {
          if (propName === '_conflicts' || propName === '_objectId') {
            delete fields[propName]
          }
        }
        for (let propName in fields.list) {
          if (propName === '_conflicts' || propName === '_objectId') {
            delete fields.list[propName]
          }
        }
        cb(null, fields)
      }
    )
    loadMetadata(null, [])
  })
}

HyperdriveAdaptor.prototype.loadTiddlerDocContent = function (filepath, cb) {
  const tiddlerDoc = this.getTiddlerDoc(filepath)
  const contentDir = path.join('tiddlers', filepath, 'content')
  this.archive.readdir(contentDir, (err, list) => {
    if (err) return cb(err)
    const changes = list
      .map(filename => {
        const match = filename.match(/^([0-9a-f]+)\.(\d+)\.json$/)
        if (!match) return {}
        return {
          filename,
          actorKey: match[1],
          seq: Number(match[2])
        }
      })
      .filter(({actorKey, seq}) => {
        if (!actorKey) return false
        if (!tiddlerDoc.contentLast[actorKey]) return true
        if (seq <= tiddlerDoc.contentLast[actorKey]) return false
        return true
      })
      .sort((a, b) => a.seq - b.seq || a.actorKey < b.actorKey)
    const loadContent = changes.reverse().reduce(
      (cb, change) => {
        return (err, result) => {
          if (err) return cb(err)
          const {actorKey, seq, filename} = change
          if (!tiddlerDoc.contentLast[actorKey]) {
            tiddlerDoc.contentLast[actorKey] = 0
          }
          if (tiddlerDoc.contentLast[actorKey] != seq - 1) {
            // Skip if there are holes in the sequence
            console.error('Skipping', filepath, actorKey, seq,
              'wanted', tiddlerDoc.contentLast[actorKey] + 1)
            return cb(null, result)
          }
          const fullPath = path.join(contentDir, filename)
          this.archive.readFile(fullPath, 'utf-8', (err, data) => {
            if (err) return cb(err)
            try {
              const changeRecord = JSON.parse(data)
              changeRecord.actor = actorKey
              changeRecord.seq = seq
              tiddlerDoc.contentLast[actorKey]++
              cb(null, [...result, changeRecord])
            } catch (e) {
              console.error('JSON parse error', e)
              return cb(new Error('JSON parse error'))
            }
          })
        }
      },
      (err, result) => {
        if (err) return cb(err)
        tiddlerDoc.contentDoc = Automerge.applyChanges(
          tiddlerDoc.contentDoc,
          result
        )
        const text = tiddlerDoc.contentDoc.text ?
          tiddlerDoc.contentDoc.text.join('') : ''
        cb(null, text)
      }
    )
    loadContent(null, [])
  })
}

HyperdriveAdaptor.prototype.getTiddlerDoc = function (filepath) {
  if (!this.tiddlerDocs[filepath]) {
    const {actorKey} = this
    const metadataDoc = Automerge.init(actorKey)
    const contentDoc = Automerge.init(actorKey)
    this.tiddlerDocs[filepath] = {
      metadataDoc,
      metadataLast: {[actorKey]: 0},
      contentDoc,
      contentLast: {[actorKey]: 0}
    }
  }
  return this.tiddlerDocs[filepath]
}

/*
Save a tiddler and invoke the callback with (err,adaptorInfo,revision)
*/
HyperdriveAdaptor.prototype.saveTiddler = function (tiddler, cb) {
  const {title} = tiddler.fields
  if (title === '$:/StoryList') return cb()
  if (tiddler.fields['draft.of']) return cb() // 
  this.archive.ready(() => {
    this.saveMetadata(tiddler, err => {
      if (err) return cb(err)
      this.saveContent(tiddler, cb)
    })
  })
}

HyperdriveAdaptor.prototype.saveMetadata = function (tiddler, cb) {
  const {actorKey, archive} = this
  const {title} = tiddler.fields
  const filepath = this.generateTiddlerBaseFilepath(title) 
  const tiddlerDoc = this.getTiddlerDoc(filepath)
  const oldMetadataDoc = tiddlerDoc.metadataDoc
  const newMetadataDoc = Automerge.change(oldMetadataDoc, doc => {
    if (!doc.fields) {
      doc.fields = {}
    }
    const fields = tiddler.getFieldStrings()
    for (const fieldName in fields) {
      if (fieldName === 'text') continue
      if (!equal(doc.fields[fieldName], fields[fieldName])) {
        // FIXME: Should be smarter with fields that are arrays
        doc.fields[fieldName] = fields[fieldName]
      }
    }
  })
  tiddlerDoc.metadataDoc = newMetadataDoc
  const changes = Automerge.getChanges(oldMetadataDoc, newMetadataDoc)
    .filter(change => (
      change.actor === actorKey &&
      change.seq > tiddlerDoc.metadataLast[actorKey]
    ))

  const base = `tiddlers/${filepath}/metadata/${actorKey}`
  const save = changes.reverse().reduce(
    (cb, change) => {
      return err => {
        if (err) return cb(err)
        const {actor, seq, ...rest} = change
        tiddlerDoc.metadataLast[actorKey] = seq
        const fullPath = `${base}.${seq}.json`
        const json = JSON.stringify(rest)
        archive.writeFile(fullPath, json, cb)
      }
    },
    cb
  )
  save()
}

HyperdriveAdaptor.prototype.saveContent = function (tiddler, cb) {
  const {actorKey, archive} = this
  const {title} = tiddler.fields
  const filepath = this.generateTiddlerBaseFilepath(title) 
  const tiddlerDoc = this.getTiddlerDoc(filepath)
  const oldContentDoc = tiddlerDoc.contentDoc
  const newContentDoc = Automerge.change(oldContentDoc, doc => {
    if (!doc.text) {
      doc.text = new Automerge.Text()
      if (tiddler.fields.text) {
        doc.text.insertAt(0, ...tiddler.fields.text.split(''))
      }
    } else {
      const oldText = oldContentDoc.text ?
        oldContentDoc.text.join('') : ''
      const newText = tiddler.fields.text
      const diff = jsdiff.diffChars(oldText, newText)
      let index = 0
      diff.forEach(part => {
        if (part.added) {
          doc.text.insertAt(index, ...part.value.split(''))
          index += part.count
        } else if (part.removed) {
          doc.text.splice(index, part.count)
        } else {
          index += part.count
        }
      })
    }
  })
  tiddlerDoc.contentDoc = newContentDoc
  const changes = Automerge.getChanges(oldContentDoc, newContentDoc)
    .filter(change => (
      change.actor === actorKey &&
      change.seq > tiddlerDoc.contentLast[actorKey]
    ))

  const base = `tiddlers/${filepath}/content/${actorKey}`
  const save = changes.reverse().reduce(
    (cb, change) => {
      return err => {
        if (err) return cb(err)
        const {actor, seq, ...rest} = change
        tiddlerDoc.contentLast[actorKey] = seq
        const fullPath = `${base}.${seq}.json`
        const json = JSON.stringify(rest)
        archive.writeFile(fullPath, json, cb)
      }
    },
    cb
  )
  save()
  cb()
}

/*
Load a tiddler and invoke the callback with (err,tiddlerFields)
*/
HyperdriveAdaptor.prototype.loadTiddler = function (title, cb) {
  const filepath = this.generateTiddlerBaseFilepath(title)
  this.archive.ready(() => {
    this.loadTiddlerDocMetadata(filepath, (err, metadata) => {
      if (err) return cb(err)
      if (!metadata) return cb(new Error('Missing metadata'))
      this.loadTiddlerDocContent(filepath, (err, text) => {
        if (err) return cb(err)
        cb(null, {...metadata, text})
      })
    })
  })
}

/*
Delete a tiddler and invoke the callback with (err)
options include:
tiddlerInfo: the syncer's tiddlerInfo for this tiddler
*/
HyperdriveAdaptor.prototype.deleteTiddler = function (title, cb, options) {
  const filepath = this.generateTiddlerBaseFilepath(title)
  const baseDir = path.join('tiddlers', filepath)
  this.archive.ready(() => {
    this.rmdirRecursive(baseDir, cb)
  })
}

HyperdriveAdaptor.prototype.rmdirRecursive = function (dir, cb) {
  this.archive.stat(dir, (err, stat) => {
    if (!stat) return cb()
    if (stat.isDirectory()) {
      this.archive.readdir(dir, (err, list) => {
        const deleteAll = list.reverse().reduce(
          (cb, filename) => {
            return err => {
              if (err) return cb(err)
              const fullPath = path.join(dir, filename)
              this.archive.stat(fullPath, (err, stat) => {
                if (err) return cb(err)
                if (stat.isDirectory()) {
                  this.rmdirRecursive(fullPath, cb)
                } else if (stat.isFile()) {
                  this.archive.unlink(fullPath, cb)
                } else {
                  cb(new Error('Not directory or link')) 
                }
              })
            }
          },
          err => {
            if (err) return cb(err)
            this.archive.rmdir(dir, cb)
          }
        )
        deleteAll()
      })
    } else {
      return cb(new Error('Not a directory'))
    }
  })
}

// From filesystemadaptor.js

/*
Given a tiddler title and an array of existing filenames, generate a new
legal filename for the title, case insensitively avoiding the array of
existing filenames
*/
HyperdriveAdaptor.prototype.generateTiddlerBaseFilepath = function (title) {
	let baseFilename
	// Check whether the user has configured a tiddler -> pathname mapping
	const pathNameFilters = this.wiki.getTiddlerText("$:/config/FileSystemPaths")
	if (pathNameFilters) {
		const source = this.wiki.makeTiddlerIterator([title])
		baseFilename = this.findFirstFilter(pathNameFilters.split("\n"), source)
		if (baseFilename) {
			// Interpret "/" and "\" as path separator
			baseFilename = baseFilename.replace(/\/|\\/g, path.sep)
		}
	}
	if (!baseFilename) {
		// No mappings provided, or failed to match this tiddler so we use title as filename
		baseFilename = title.replace(/\/|\\/g, "_")
	}
	// Remove any of the characters that are illegal in Windows filenames
	baseFilename = $tw.utils.transliterate(
    baseFilename.replace(/<|>|\:|\"|\||\?|\*|\^/g, "_")
  )
	// Truncate the filename if it is too long
	if (baseFilename.length > 200) {
		baseFilename = baseFilename.substr(0, 200)
	}
	return baseFilename
}


