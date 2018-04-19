/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("workbox-v3.1.0/workbox-sw.js");
workbox.setConfig({modulePathPrefix: "workbox-v3.1.0"});

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    "url": "index.html",
    "revision": "72f62122d4e57c374b62c272e8255a50"
  },
  {
    "url": "index.js",
    "revision": "bfa4772b03fe72b79219f1184bfd1632"
  },
  {
    "url": "/img/bg-landing-page.svg",
    "revision": "46b0ea46df62fddf07ab5fd57f22fdff"
  },
  {
    "url": "/img/dat-hexagon.svg",
    "revision": "88053f7ff5ca5f0c2c71fa0d73a05388"
  },
  {
    "url": "/",
    "revision": "946b08be54320c26e8491e346383b4a3"
  },
  {
    "url": "/create",
    "revision": "f43c5b40d86c4c07f62daddd09339567"
  },
  {
    "url": "/doc",
    "revision": "bc2805df7b330be21d4d114404dc8c59"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.suppressWarnings();
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});

workbox.routing.registerNavigationRoute("/", {
  whitelist: [/^\/doc/],
  
});

workbox.routing.registerRoute(/^favicon.ico/, workbox.strategies.staleWhileRevalidate(), 'GET');
workbox.routing.registerRoute(/^https:\/\/cdn.glitch.com\//, workbox.strategies.staleWhileRevalidate(), 'GET');
workbox.routing.registerRoute(/^https:\/\/buttons.github.io\//, workbox.strategies.staleWhileRevalidate(), 'GET');
workbox.routing.registerRoute(/^https:\/\/api.github.com\//, workbox.strategies.staleWhileRevalidate(), 'GET');
