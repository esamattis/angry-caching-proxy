# Angry Caching Proxy

This is a angry caching proxy which speeds up package downloads for apt-get,
npm and rubygems.

It works by doing very angry caching (forever!) for the actual package files.
This should work ok as long as the package authors won't override already
uploaded packages. For details review the [handler
files](https://github.com/epeli/angry-caching-proxy/tree/master/handlers).


## Install

Get node.js and type

    sudo npm install -g angry-caching-proxy

or if you don't like sudoing random code you can install it locally too:

    npm install angry-caching-proxy

and execute it with

    node_modules/.bin/angry-caching-proxy

## Usage

Create directory where save cached files

    mkdir cache

and start the server

    angry-caching-proxy --directory cache

### apt-get

    http_proxy=http://localhost:8000 sudo -E apt-get install sl

### Bundler

    http_proxy=http://localhost:8000 bundle install

### npm

With npm it is required to use the non-https version of the registry

    http_proxy=http://localhost:8000 npm install --registry http://registry.npmjs.org/


Cool guys can also set the proxy globally for everybody:

    export http_proxy=http://localhost:8000

