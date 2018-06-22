const fetch = require('node-fetch')
const log = require('ilp-logger')('ilp-fetch')
const crypto = require('crypto')
const base64url = buffer => buffer.toString('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')

const PSK_IDENTIFIER = 'interledger-psk'
const PSK_2_IDENTIFIER = 'interledger-psk2'
const STREAM_IDENTIFIER = 'interledger-stream'
const handlePsk2Request = require('./src/psk2')
const handleStreamRequest = require('./src/stream')

async function ilpFetch (url, _opts) {
  // Generate the payment token to go along with our requests
  const payToken = _opts.payToken || crypto.randomBytes(16)
  const payTokenText = base64url(payToken)

  // Add the payment token to the headers
  const headers = Object.assign({},
    (_opts.headers || {}),
    { 'Pay-Token': payTokenText })

  // Make the request for the first time---if the endpoint is paid, this will
  // fail.
  log.info('attempting http request. url=' + url, 'opts=', _opts)
  const opts = Object.assign({}, _opts, { headers })
  const firstTry = await fetch(url, opts)

  // If the request succeeded, just return the result. Keep going if payment is
  // required.
  if (firstTry.status !== 402) {
    log.info('request is not paid. returning result.')
    firstTry.price = '0'
    return firstTry
  }

  const maxPrice = opts.maxPrice
  const plugin = opts.plugin || require('ilp-plugin')()

  if (!maxPrice) {
    throw new Error('opts.maxPrice must be specified on paid request')
  }

  // Parse the `Pay` header to determine how to pay the receiver. A handler is
  // selected by checking what the payment method is.
  const [ payMethod, ...payParams ] = firstTry.headers.get('Pay').split(' ')
  log.trace('parsed `Pay` header. method=' + payMethod, 'params=', payParams)

  let handler
  switch (payMethod) {
    case PSK_2_IDENTIFIER:
      log.trace('using PSK2 handler.')
      handler = handlePsk2Request
      break

    case STREAM_IDENTIFIER:
      log.trace('using STREAM handler.')
      handler = handleStreamRequest
      break

    case PSK_IDENTIFIER:
      log.warn('PSK1 is no longer supported. use `superagent-ilp` for legacy PSK.')
    default:
      log.error('no handler exists for payment method. method=' + payMethod)
      throw new Error('unsupported payment method in `Pay`. ' +
        'header=' + firstTry.headers.get('Pay'))
  }

  log.trace('connecting plugin')
  await plugin.connect()

  log.trace('calling handler.')
  return handler({ firstTry, url, opts, payParams, plugin, payToken })
}

module.exports = ilpFetch
