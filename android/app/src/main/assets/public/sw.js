/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "18f3562d9038ac772622aec03137729a"
  }, {
    "url": "pwa-512x512.png",
    "revision": "b2484f2bf59ba1841cc24721d10ea857"
  }, {
    "url": "pwa-192x192.png",
    "revision": "58924c4096bf00909e3b9a522d3a2897"
  }, {
    "url": "index.html",
    "revision": "2ceb67cea0a4f46dc363219364ecc197"
  }, {
    "url": "icon.svg",
    "revision": "4389f92af96413c1073c1dbb3495604c"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "02ab06e36123e700c8cb5244dbd954b6"
  }, {
    "url": "tesseract/worker.min.js",
    "revision": "b1ab464237e687b323da236fff45ba05"
  }, {
    "url": "tesseract/tesseract-core-simd-lstm.wasm.js",
    "revision": "2bd630487581a49b7d7cce1bfe42314c"
  }, {
    "url": "tesseract/tesseract-core-lstm.wasm.js",
    "revision": "a3c227d2e04b7be5d1ef50d75f3a5ee3"
  }, {
    "url": "tesseract/lang-data/eng.traineddata.gz",
    "revision": "7b72f51cfc199301b157770e5b311ca2"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/web-Cf2U62RH.js",
    "revision": null
  }, {
    "url": "assets/web-CRJlxQPz.js",
    "revision": null
  }, {
    "url": "assets/purify.es-BQJV6A36.js",
    "revision": null
  }, {
    "url": "assets/pdf.worker.min-CIqJB0yW.mjs",
    "revision": null
  }, {
    "url": "assets/index.es-B-44hNo9.js",
    "revision": null
  }, {
    "url": "assets/index-DykkE3iX.js",
    "revision": null
  }, {
    "url": "assets/index-B4fmWyUO.css",
    "revision": null
  }, {
    "url": "assets/html2canvas-Dp4XRHZA.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "02ab06e36123e700c8cb5244dbd954b6"
  }, {
    "url": "icon.svg",
    "revision": "4389f92af96413c1073c1dbb3495604c"
  }, {
    "url": "pwa-192x192.png",
    "revision": "58924c4096bf00909e3b9a522d3a2897"
  }, {
    "url": "pwa-512x512.png",
    "revision": "b2484f2bf59ba1841cc24721d10ea857"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "18f3562d9038ac772622aec03137729a"
  }, {
    "url": "manifest.webmanifest",
    "revision": "2807e6c1ce6c8105bf09b49f9104de35"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
