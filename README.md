# restify-request-cache
Wrapper function for a restify route handler, to cache the request results using memcache.

## Table of contents
- [restify-request-cache](#restify-request-cache)
  - [Table of contents](#table-of-contents)
  - [Why this package exists](#why-this-package-exists)
  - [Installation](#installation)
    - [NPM](#npm)
    - [YARN](#yarn)
  - [How to use](#how-to-use)
    - [Example](#example)
    - [Options](#options)
  - [Memcached](#memcached)
    - [Setting up](#setting-up)
    - [Server](#server)
  - [What to expect in future releases](#what-to-expect-in-future-releases)

## Why this package exists
Currently there are limited caching packages out there that support Restify. For this reason I have made a small package specifically for Restify to cache requests very easily using Memcached.

## Installation
### NPM
`npm install restify-request-cache`
### YARN
`yarn add restify-request-cache`

Then require into your project as followed:

`const { Memcached, restifyRequestCache } = require('restify-request-cache');`

## How to use
### Example
```
const restify = require('restify');
const {
  Memcached,
  restifyRequestCache,
} = require('restify-request-cache');

const server = restify.createServer();
const memcached = new Memcached('172.17.0.2:11211', {} /* Memcached options */);

server.get(
  '/hello/:name', // Route path
  /**
   * This is where we wrap the restifyRequestCache method
   * around our normal restify route handler.
   */
  restifyRequestCache(async (req, res, next) => {
    res.send(200, req.params.name, {});
    next();
  }, memcached, {} /* options */ ),
);


server.listen(8080, () => {
  // eslint-disable-next-line no-console
  console.log('%s listening at %s', server.name, server.url);
});
```
### Options
Currently the following options are used, which can be overwritten when passing an `Object` as third argument to the `restifyRequestCache` method.
- `ttl`: <b>Number</b> number of seconds the cached object will remain.
- `hash.alghorithm`: <b>String</b> alghorithm used to create hash from request (will be used as key in cache).
- `hash.inputEncoding`: <b>String</b> encoding of input data.
- `hash.digest`: <b>String</b> encoding of output data (cache key).
```
const defaultOptions = {
  ttl: 10,
  hash: {
    alghorithm: 'md5',
    inputEncoding: 'utf8',
    digestEncoding: 'hex',
  },
};
```

## Memcached
### Setting up
To read more about how to set up Memcached, click on the following link: <br>https://www.npmjs.com/package/memcached.
### Server
A quick way to start using Memcached with Docker: <br>https://hub.docker.com/_/memcached.

## What to expect in future releases
- In-memory support.
- Redis support.
- The ability to bust cached requests.
