# dat-shopping-list-tokyo

![Logo](https://dat-shopping-list-tokyo.glitch.me/img/dat-shopping-list-96.png)

[https://dat-shopping-list-tokyo.glitch.me/](https://dat-shopping-list-tokyo.glitch.me/)

This is an version of [https://dat-shopping-list.glitch.me/](https://dat-shopping-list.glitch.me/) with updated dependencies that was presented at the [Distributed DATa Evening](https://georepublic.connpass.com/event/105079/) in Tokyo in November, 2018.

# Overview

Dat Shopping List is a "Progressive Web App" built to demonstrate how to use the
new "multiwriter" capabalities that are being added to the [Dat Project](https://datproject.org/).

The demo is a simple "to do list" app, in the spirit of the [TodoMVC](http://todomvc.com/) project. 

You can run it on any modern web browser. Also, you can run it on your mobile phone (iOS and Android), and it should work offline as well as online.

Check out the blog post:

* [Demo: A Collaborative Shopping List Built On Dat](https://blog.datproject.org/2018/05/14/dat-shopping-list/)

![Quick Usage Gif](https://dat-shopping-list-video-jimpick.hashbase.io/dat-shopping-list-basic.gif)

## Video Walkthrough

Here is a short (2.5 minute) walkthrough of the demo.

* [Video Walkthrough (MP4)](https://dat-shopping-list-video-jimpick.hashbase.io/dat-shopping-list-1.mp4)


# Quick Deploy / Free Hosting Options

The demo is very easy to deploy, as it is self-contained, and requires no storage.

There are many ways for you to run your own instance. You may want to run your own instance for privacy reasons, reliability reasons, or so you can customize it.

## Glitch

dat-shopping-list-tokyo was developed on Glitch. Glitch is very nice. It is free, and it gives you a Node.js backend as well as an in-browser IDE with multi-user editing and debugging! Use the following link to fork your own copy of the Node.js gateway service and front-end user interface:

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/dat-shopping-list-tokyo)

Note: Occasionally, Glitch gets into a state where it can't read from the disk. One way to get going again is to run: `rm -rf node_modules && npm install` on the console.

## Heroku

The app can easily be deployed to Heroku, which offers either 550-1000 hours a month for free (sleeps after 30 minutes of inactivity). 

[Heroku Pricing](https://www.heroku.com/pricing)

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Zeit now.sh

[Zeit](https://zeit.co/account/plan) offers a free "OSS" plan that works with the Dockerfile. Once you are signed up and have the command line tool installed, you can deploy straight from the github repo:  

```
now jimpick/dat-shopping-list
```

Note: If you use the OSS plan, the logs will be publicly available, which may not be what you want, as people will be able to see the keys of shopping lists that have been synced through the gateway, and they will be able to download the data. The logging could be changed to hide the keys.

## Docker

The git repo includes a simple Dockerfile. There is also a Docker image published here:

[https://hub.docker.com/r/jimpick/dat-shopping-list/](https://hub.docker.com/r/jimpick/dat-shopping-list/)

If you have docker installed, you should be able to run it:

```
docker run -p 5000:5000 jimpick/dat-shopping-list
```

Several of the major cloud hosting companies offer a free tier or introductory offer where you can run Docker images.

## npm

The demo is published on npm:

[https://www.npmjs.com/package/dat-shopping-list](https://www.npmjs.com/package/dat-shopping-list)

You can try it out using `npx`:

```
npx dat-shopping-list
```

or you can install it globally and run it:

```
npm install -g dat-shopping-list

dat-shopping-list
```

It should work on Mac and Linux. It hasn't been tested on Windows.

# License

MIT
