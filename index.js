/*!
 * finalhandler
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var accepts = require('accepts')
var debug = require('debug')('finalhandler')
var escapeHtml = require('escape-html')
var http = require('http')

/**
 * Variables.
 */

/* istanbul ignore next */
var defer = typeof setImmediate === 'function'
  ? setImmediate
  : function(fn){ process.nextTick(fn.bind.apply(fn, arguments)) }

/**
 * Module exports.
 */

module.exports = finalhandler

/**
 * Final handler:
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Object} [options]
 * @return {Function}
 * @api public
 */

function finalhandler(req, res, options) {
  options = options || {}

  // get message option
  var message = options.message === true
    ? getDefaultErrorMessage
    : options.message || false

  if (typeof message !== 'boolean' && typeof message !== 'function') {
    throw new TypeError('option message must be boolean or function')
  }

  // get error callback
  var onerror = options.onerror

  // get stack trace option
  var stacktrace = options.stacktrace || false;

  return function (err) {
    var body
    var constructBody
    var msg
    var status = res.statusCode

    // unhandled error
    if (err) {
      // default status code to 500
      if (!status || status < 400) {
        status = 500
      }

      // respect err.status
      if (err.status >= 400 && err.status < 600) {
        status = err.status
      }

      // build a stack trace or normal message
      msg = stacktrace
        ? getErrorStack(err, status, message)
        : getErrorMessage(err, status, message)
    } else {
      status = 404
      msg = 'Cannot ' + req.method + ' ' + (req.originalUrl || req.url)
    }

    debug('default %s', status)

    // schedule onerror callback
    if (err && onerror) {
      defer(onerror, err, req, res)
    }

    // cannot actually respond
    if (res._header) {
      return req.socket.destroy()
    }

    // negotiate
    var accept = accepts(req)
    var type = accept.types('html', 'text')

    // construct body
    switch (type) {
      case 'html':
        constructBody = constructHtmlBody
        break
      default:
        // default to plain text
        constructBody = constructTextBody
        break
    }

    // construct body
    body = constructBody(status, msg)

    // send response
    send(req, res, status, body)
  }
}

/**
 * Get HTML body string
 *
 * @param {number} status
 * @param {string} message
 * @return {Buffer}
 * @api private
 */

function constructHtmlBody(status, message) {
  var msg = escapeHtml(message)
    .replace(/\n/g, '<br>')
    .replace(/  /g, ' &nbsp;')

  var html = '<!doctype html>\n'
    + '<html lang=en>\n'
    + '<head>\n'
    + '<meta charset=utf-8>\n'
    + '<title>' + escapeHtml(http.STATUS_CODES[status]) + '</title>\n'
    + '</head>\n'
    + '<body>\n'
    + msg + '\n'
    + '</body>\n'

  var body = new Buffer(html, 'utf8')

  body.type = 'text/html; charset=utf-8'

  return body
}

/**
 * Get plain text body string
 *
 * @param {number} status
 * @param {string} message
 * @return {Buffer}
 * @api private
 */

function constructTextBody(status, message) {
  var msg = message + '\n'
  var body = new Buffer(msg, 'utf8')

  body.type = 'text/plain; charset=utf-8'

  return body
}

/**
 * Get message from error
 *
 * @param {object} err
 * @param {number} status
 * @param {function} message
 * @return {string}
 * @api private
 */

function getErrorMessage(err, status, message) {
  var msg

  if (message) {
    msg = message(err, status)
  }

  return msg || http.STATUS_CODES[status]
}

/**
 * Get default message from error
 *
 * @param {object} err
 * @return {string}
 * @api private
 */

function getDefaultErrorMessage(err) {
  return err.status >= 400 && err.status < 600
    ? err.message
    : undefined
}

/**
 * Get stack from error with custom message
 *
 * @param {object} err
 * @param {number} status
 * @param {function} message
 * @return {string}
 * @api private
 */

function getErrorStack(err, status, message) {
  var stack = err.stack || ''

  if (message) {
    var index = stack.indexOf('\n')
    var msg = message(err, status) || err.message || String(err)
    var name = err.name

    // slice implicit message from top of stack
    if (index !== -1) {
      stack = stack.substr(index)
    }

    // prepend name and message to stack
    stack = name
      ? name + ': ' + msg + stack
      : msg + stack
  } else if (!stack) {
    // stringify error when no message generator and no stack
    stack = String(err)
  }

  return stack
}

/**
 * Send response.
 *
 * @param {IncomingMessage} req
 * @param {OutgoingMessage} res
 * @param {number} status
 * @param {Buffer} body
 * @api private
 */

function send(req, res, status, body) {
  function write() {
    res.statusCode = status

    // security header for content sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff')

    // standard headers
    res.setHeader('Content-Type', body.type)
    res.setHeader('Content-Length', body.length)

    if (req.method === 'HEAD') {
      res.end()
      return
    }

    res.end(body, 'utf8')
  }

  if (!req.readable) {
    write()
    return
  }

  // unpipe everything from the request
  unpipe(req)

  // flush the request
  req.once('end', write)
  req.resume()
}

/**
 * Unpipe everything from a stream.
 *
 * @param {Object} stream
 * @api private
 */

/* istanbul ignore next: implementation differs between versions */
function unpipe(stream) {
  if (typeof stream.unpipe === 'function') {
    // new-style
    stream.unpipe()
    return
  }

  // Node.js 0.8 hack
  var listener
  var listeners = stream.listeners('close')

  for (var i = 0; i < listeners.length; i++) {
    listener = listeners[i]

    if (listener.name !== 'cleanup' && listener.name !== 'onclose') {
      continue
    }

    // invoke the listener
    listener.call(stream)
  }
}
