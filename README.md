# finalhandler

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-image]][node-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

Node.js function to invoke as the final step to respond to HTTP request.

## Installation

```sh
$ npm install finalhandler
```

## API

```js
var finalhandler = require('finalhandler')
```

### finalhandler(req, res, [options])

Returns function to be invoked as the final step for the given `req` and `res`.
This function is to be invoked as `fn(err)`. If `err` is falsy, the handler will
write out a 404 response to the `res`. If it is truthy, an error response will
be written out to the `res`, and `res.statusCode` is set from `err.status` if the
value is 4xx or 5xx.

The final handler will also unpipe anything from `req` when it is invoked.

#### options.onerror

Provide a function to be called with the `err` when it exists. Can be used for
writing errors to a central location without excessive function generation. Called
as `onerror(err, req, res)`.

#### options.stacktrace

Specify if the stack trace of the error should be included in the response. By
default, this is false, but can be enabled when necessary (like in development).
It is not recommend to enable this on a production deployment

## Examples

### always 404

```js
var finalhandler = require('finalhandler')
var http = require('http')

var server = http.createServer(function (req, res) {
  var done = finalhandler(req, res)
  done()
})

server.listen(3000)
```

### perform simple action

```js
var finalhandler = require('finalhandler')
var fs = require('fs')
var http = require('http')

var server = http.createServer(function (req, res) {
  var done = finalhandler(req, res)

  fs.readFile('index.html', function (err, buf) {
    if (err) return done(err)
    res.setHeader('Content-Type', 'text/html')
    res.end(buf)
  })
})

server.listen(3000)
```

### use with middleware-style functions

```js
var finalhandler = require('finalhandler')
var http = require('http')
var serveStatic = require('serve-static')

var serve = serveStatic('public')

var server = http.createServer(function (req, res) {
  var done = finalhandler(req, res)
  serve(req, res, done)
})

server.listen(3000)
```

### keep log of all errors

```js
var finalhandler = require('finalhandler')
var fs = require('fs')
var http = require('http')

var server = http.createServer(function (req, res) {
  var done = finalhandler(req, res, {onerror: logerror})

  fs.readFile('index.html', function (err, buf) {
    if (err) return done(err)
    res.setHeader('Content-Type', 'text/html')
    res.end(buf)
  })
})

server.listen(3000)

function logerror(err) {
  console.error(err.stack || err.toString())
}
```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/finalhandler.svg?style=flat
[npm-url]: https://npmjs.org/package/finalhandler
[node-image]: http://img.shields.io/badge/node.js-%3E%3D_0.8-brightgreen.svg?style=flat
[node-url]: http://nodejs.org/download/
[travis-image]: https://img.shields.io/travis/pillarjs/finalhandler.svg?style=flat
[travis-url]: https://travis-ci.org/pillarjs/finalhandler
[coveralls-image]: https://img.shields.io/coveralls/pillarjs/finalhandler.svg?style=flat
[coveralls-url]: https://coveralls.io/r/pillarjs/finalhandler?branch=master
[downloads-image]: http://img.shields.io/npm/dm/finalhandler.svg?style=flat
[downloads-url]: https://npmjs.org/package/finalhandler
