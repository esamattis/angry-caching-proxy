[![Build Status](https://travis-ci.org/epeli/angry-caching-proxy.png?branch=master)](https://travis-ci.org/epeli/angry-caching-proxy) [![Greenkeeper badge](https://badges.greenkeeper.io/epeli/angry-caching-proxy.svg)](https://greenkeeper.io/)

# Angry Caching Proxy

![screenshot](https://github.com/epeli/angry-caching-proxy/raw/master/extra/screenshot.png)

Make package downloads lightning fast for apt-get, npm, pip and Rubygems!

Angry Caching Proxy is forwarding proxy for various package managers. It is
configured transparently to the clients using the `http_proxy` environment
variable. So there is no need to have customized sources.list, Gemfile etc.

It works by doing very angry caching (forever!) for the actual package files.
This should be ok as long as the package authors won't override already
uploaded packages. It is a very bad practice by the package authors and happens
very rarely. If it happens anyway you can always clear the cache from the web
interface of Angry Caching Proxy.

## Use cases

Installing or upgrading multiple Ubuntu machines. In the worst case you have to
download gigabytes of .deb packages for each machine. With Angry Caching Proxy
the packages are downloaded once and then served instantly from the cache.

When doing distributed builds it might be hard to share local disk caches.

Just speeding up your local `bundle install` runs.


## Install

Get node.js and type

    sudo npm install -g angry-caching-proxy

or if you don't like sudoing random code you can install it locally too:

    npm install angry-caching-proxy

and execute it with

    node_modules/.bin/angry-caching-proxy

## Configuration

Create `/etc/angry-caching-proxy/config.json` with any of the following keys:

  - `directory`: Where to store cached requests.
  - `port`: Port to listen.
    - default: 8080
  - `workers`: Workers to use. Default to machine cpu core count.
  - `customTriggers`: Path to custom triggers module.
    - default: /etc/angry-caching-proxy/triggers.js
  - `triggers`: Array of triggers to activate.
    - default `["apt-get", "npm", "pypi", "rubygems"]`


## Custom triggers

 If you want to add additional caching you can create
 `/etc/angry-caching-proxy/triggers.js` file with your own caching functions.
 It should export an object of functions that return `true` when the request
 should be cached. The caching occurs only if the upstream responds with http
 success status 200. Only GET requests can be cached.

Example:

```javascript
module.exports = {
    "custom": function isMyCustomCacheRequest(req, res) {
        // Cache all requests that contain X-My-Cache header
        return req.headers["X-My-Cache"]);
    },
};

```

See
[buildin-triggers.js](https://github.com/epeli/angry-caching-proxy/blob/master/buildin-triggers.js)
for examples.

New build-in triggers are also welcome as a pull request.

## Usage

Create directory where to save cached requests

    mkdir cache

and start the server

    angry-caching-proxy --directory cache

You can inspect and clear the cache by browsing directly to the proxy address
<http://localhost:8080>

### apt-get

    http_proxy=http://localhost:8080 sudo -E apt-get install sl

### Bundler (Rubygems)

    http_proxy=http://localhost:8080 bundle install

### npm

With npm it is required to use the non-https version of the registry

    http_proxy=http://localhost:8080 npm install --registry http://registry.npmjs.org/

### Python pip

With pip use the non-https version of the registry:

    http_proxy=http://localhost:8080 pip install  --index-url http://pypi.python.org/simple plone

Cool guys can also set the proxy globally for everybody:

    export http_proxy=http://localhost:8080

