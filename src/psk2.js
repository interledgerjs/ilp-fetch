const PSK2 = require('ilp-protocol-psk2')
const fetch = require('node-fetch')
const BigNumber = require('bignumber.js')
const crypto = require('crypto')
const debug = require('debug')('ilp-fetch:psk2')
const CHUNK_AMOUNT = 250 // TODO

async function streamPayment ({
  url,
  opts,
  payParams,
  plugin,
  payToken
}) {
  const [ destinationAccount, _sharedSecret ] = payParams
  debug('streaming via psk2. destination=' + destinationAccount)

  const id = payToken
  const sharedSecret = Buffer.from(_sharedSecret, 'base64')
  let sequence = 0
  let total = 0

  opts.headers['Stream-Payment'] = true

  debug('opening request while streaming payment.')
  let resolved = false
  const promise = fetch(url, opts)
    .then((res) => {
      debug('streaming request success.')
      resolved = true
      return res
    })
    .catch((e) => {
      debug('streaming request failed. error=', e)
      resolved = true
      throw e
    })

  while (!resolved) {
    debug('streaming chunk via psk2. amount=' + CHUNK_AMOUNT,
      'total=' + total)
    if (new BigNumber(total).gt(opts.maxPrice)) {
      throw new Error('streaming payment exceeds max price. total=' + total +
        'maxPrice=' + opts.maxPrice)
    }

    try {
      const result = await PSK2.sendRequest(plugin, {
        destinationAccount,
        sharedSecret,
        sourceAmount: CHUNK_AMOUNT,
        data: payToken
      })
      if (!result.fulfilled) {
        throw new Error(`payment rejected with code: ${result.code}${result.data.length ? ' ' + result.data.toString('utf8') : ''}`)
      }
      total += CHUNK_AMOUNT
    } catch (e) {
      debug('error on payment chunk. message=' + e.message)
      break
    }
  }

  return promise
}

module.exports = async function handlePsk2Request (params) {
  const {
    url,
    opts,
    payParams,
    plugin,
    payToken
  } = params
  const [ destinationAccount, _sharedSecret, destinationAmount ] = payParams
  const id = payToken
  const sharedSecret = Buffer.from(_sharedSecret, 'base64')

  if (!destinationAmount) {
    return streamPayment(params)
  }

  debug('quoting destination amount via psk2. amount=' + destinationAmount,
    'account=' + destinationAccount)
  const testPaymentAmount = 1000
  const testPaymentResult = await PSK2.sendRequest(plugin, {
    sharedSecret,
    destinationAccount,
    sourceAmount: testPaymentAmount,
    unfulfillableCondition: crypto.randomBytes(32)
  })
  const sourceAmount = new BigNumber(destinationAmount)
    .dividedBy(testPaymentResult.destinationAmount)
    .times(testPaymentAmount)
    .round(0, BigNumber.ROUND_CEIL)

  if (new BigNumber(sourceAmount).gt(opts.maxPrice)) {
    throw new Error('quoted psk2 source amount exceeds max acceptable price.' +
      ' sourceAmount=' + sourceAmount +
      ' maxPrice=' + opts.maxPrice)
  }

  debug('sending payment via psk2. sourceAmount=' + sourceAmount)
  const result = await PSK2.sendRequest(plugin, {
    destinationAccount,
    sharedSecret,
    sourceAmount,
    minDestinationAmount: destinationAmount,
    data: payToken
  })
  if (!result.fulfilled) {
    throw new Error(`payment rejected with code: ${result.code}${result.data.length ? ' ' + result.data.toString('utf8') : ''}`)
  }

  debug('retrying request with funded token')
  return fetch(url, opts)
}
