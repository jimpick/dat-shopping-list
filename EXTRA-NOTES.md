# Extra Notes

These were part of an early draft of the blog post, but I cut them out because the post was too long.

### Dat Keys

In the demo, each shopping list is a Dat archive. When a Dat archive is created, it gets a "public key" (also know as just the "key") which consists of a long random string of hexadecimal numbers. It looks something like this:

`621d7eb5478cabe2597141c40231893dfebd3490bb14b1a38012fdc3f25b9696`

The key is essentially the "name" used to represent the Dat archive when it's time to share and replicate the data. The data inside the archive is also encrypted, so somebody needs the public key to be able to read what's inside. The key is long enough to be "unguessable" ... it's safe to assume that the only people who can sync and read the data are those who got their hands on the public key. If you want to keep your shopping list secret just to yourself, **don't share that key!** If you want to share a list between friends, just share the key with them only. If you want the whole world to see your shopping list, post the key publicly.

### The "gateway" service

When you create a shopping list, and you are online, the data is automatically synced to a web service that is part of the demo. It is a simple two direction sync between your web browser and the Node.js program that acts as the "gateway" service. When you go offline, syncing stops, and when you go online again, syncing starts again. There is a small status indicator in the upper right to give you some feedback on whether or not you are connected, and if your data has been synced.

### Who do you trust?

It is very important to make sure that you trust the gateway service, as it has a full copy of your data and the public key, so whoever is running the server can read any shopping list synchronized with it.

If privacy is your concern, it is very easy to re-install the server used in this demo on some hardware that you control -- instructions are in the [README](https://github.com/jimpick/dat-shopping-list/blob/master/README.md) file.

### The "swarm"

Once the data is synced, the gateway server will keep it's copy of the data and make it available for syncing to any other computers on the internet that want it. If somebody else has the "key", they can connect to the gateway server to download the data using the Dat project's "discovery" mechanisms.

The peer-to-peer networking that goes on when many peers are connecting and sharing data to other peers is called "the swarm", because when there are many peers, the network activity is as busy as a beehive.

The good news is that the web app doesn't have to drain your cell phone battery doing all that communication. Once the data is synced to the gateway server, the server does all that work on your behalf, even when you are no longer online.

In order to prevent abuse, the gateway that is used in the demo clears itself out every 24 hours, and has a limit on the number of shopping lists that it will host in the swarm. Nobody will lose data when the gateway resets, as the master copy is in their web browser storage, and they can resync at any time. But don't expect to be able to sync with devices that have been offline for a long time. If you run your own gateway service, you can modify it to "pin" your data in the swarm for a longer period of time.

A possible future enhancement would be to use a "pinning" service such as [Hashbase](https://hashbase.io/) (commercial) or [Homebase](https://github.com/beakerbrowser/homebase) (self-hosted) to keep synchronized shopping lists alive in the swarm forever.

### Replicating a shopping list

Once you have created a shopping list in one place, and you want to sync it to somewhere else, you have to do a little "cut-and-paste" between devices (or people if you are sharing with somebody else).

On the device where you created the shopping list, you need to get the "key" of the shopping list. In a web browser, you can simply copy the URL from the browser's location bar, eg:

[https://dat-shopping-list.glitch.me/doc/621d7eb5478cabe2597141c40231893dfebd3490bb14b1a38012fdc3f25b9696](https://dat-shopping-list.glitch.me/doc/621d7eb5478cabe2597141c40231893dfebd3490bb14b1a38012fdc3f25b9696)

As it's hard to copy the URL in a mobile browser, and impossible if you have saved the app to your home screen, there is a shortcut you can use. Just tap the "hex number" in the upper right (under the status display) and the URL will be copied to your clipboard.

You can simple paste the URL you copied into a chat app or a wiki to transfer it privately to your other device, and then open it in a web browser on the other device.

If you have already saved the app to your home screen, it is impossible to open the URL directly. In that case, you can use the "Have a link? Paste it here" button on the home screen.

Once you have opened the link, the shopping list will be synced down to your browser. It is also registered in the list of all shopping lists in your browser.

## Multiple writers

When you open a new link from another device or from somebody else, you will see a notice at the top that says "You are not currently authorized to write to this document" in red letters. In this demo, "document", "shopping list" and "multiwriter Dat archive" all mean the same thing.

Every separate device, browser or user can write their own changes, so they are called "writers". To make things easier to explain, we're going to refer to each instance of the document as a separate writer, even though they might be controlled by the same person, be on the same device in a different browser, etc.

As a new writer, you can make changes to your local copy of the document, but they won't be automatically synced back to the original writer.

On the original device that created the document, it is possible to "authorize" new writers, and their changes will be replicated and merged into the "source" document. Once a local key is authorized, you could consider the new writer to be an "owner" of the document, as they can also authorize new writers. 

Each new writer has their own "local key" which represents their changes. In order to get authorized, they must copy this key from their local writable copy and send it back to any writer that is already authorized to write to the document.

In a user-friendly system, this "key exchange" might be automated in some manner, but for this demo, we wanted to teach the basics.

As a new writer, if you are unauthorized, you will see your local key on the screen, with a green button to "Copy to Clipboard." Simply send this key to an "owner", and they will paste it into the "Add a writer" input in their shopping list and click "Authorize". This will update the document, and the new writer should see that they are now authorized on their next sync. Any changes that were made by the new writer before they were authorized will be incorporated into the shopping list.

Currently, there is no mechanism for de-authorizing already authorized writers.

## Things to try

The demo has been tested on the following platforms:

* Google Chrome
* Firefox
* Apple Safari
* Microsoft Edge
* Mobile Safari on iOS
* Google Chrome on Android

Some suggested experiments:

1. Try creating a shopping list on a web browser on your desktop or laptop, and then open it in a web browser on your phone.

2. Try exchanging keys so that both devices can write to the same shopping list.

3. On a phone, try the "Add to Home Screen" feature from the web browser. It works differently on Android than iOS. On Android, you will see the same shopping lists in the home screen app as you see in your browser, and you can only save one icon to the home screen. On iOS, you can make multiple icons on your home screen, and each icon will act like a different web browser with separate storage and have it's own independent list of shopping lists.

4. After syncing, try putting your phone into 'airplane' mode. The status display should display that the network is offline, and when you make changes to the shopping list, it should display the number of records to sync. If the status display displays "Worker Ready", then that means your platform supports service workers, so you should be able reload the page even when offline.

5. Try making some lists and share them with other people.

6. Try making a list and putting it on every device and web browser that you have.

7. Try using the experimental `dat-next` [command line](https://github.com/joehand/dat-next) tool to download the files from one of your shopping lists to your local file system.

## Development Notes

The demo was primarily developed on [Glitch](https://glitch.com/edit/#!/dat-shopping-list). Glitch is really neat. It gives you a multi-user editing environment, as well as a backing virtual machine so you can run Node.js, as well as one click forking.

The source code is published on [GitHub](https://github.com/jimpick/dat-shopping-list). The README has some additional information on how to deploy the code to platforms such as Heroku and Zeit, as well as Docker and running the demo using the `npx` tool from npm.

Presently, multiwriter support hasn't been introduced into all of the Dat project tools, but it is being developed in the "hyperdb-backend" branch of [hyperdrive](https://github.com/mafintosh/hyperdrive/tree/hyperdb-backend). The core of multiwriter support is implemented in the [hyperdb](https://github.com/mafintosh/hyperdb) library.

Hyperdb is useful standalone, without hyperdrive. Hyperdrive gives you a filesystem abstraction, ideal if you are dealing with large files, whereas hyperdb gives you a key/value store. The dat-shopping-list demo is quite simple and could have easily been implemented using only hyperdb, but I wanted to try out the filesystem capabilities. 

For the client side web framework, I used the [choo](https://github.com/choojs/choo) framework. To generate the service worker, I used [Workbox](https://developers.google.com/web/tools/workbox/) from Google. For bundling, it uses [budo](https://github.com/mattdesl/budo) which is a development server for [browserify](http://browserify.org/) projects. Unfortunately, Glitch has a few filesystem issues, so I couldn't use watch.json with budo, so it's necessary to do a full rebuild after every edit. There is no separate production build for the demo... the development server is the production server. Many other very useful npm modules were used ... you can find the list in the [package.json](https://github.com/jimpick/dat-shopping-list/blob/master/package.json) file.

I dogfooded the project by keeping my development [task list](https://dat-shopping-list.glitch.me/doc/95fe65d1af31a38b22a31ab31bc7862e80071f8482e17c8aacd18e02842b3f55) as a shopping list - it was nice being able to synchronize between many devices and to be able to check off tasks as they were completed. I even managed to find and squash some corruption issues in hyperdb that popped. I have a list of possible [future features](https://dat-shopping-list.glitch.me/doc/bc14e0054876d561e4890c747ff9d38fe87bcc83a969e2bdb2ce5e4147defe11) in another list.
