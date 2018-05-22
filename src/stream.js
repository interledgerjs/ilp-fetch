const { createConnection } = require('ilp-protocol-stream')
const debug = require('debug')('ilp-fetch:stream')
const fetch = require('node-fetch')

async function streamPayment ({
  url,
  opts,
  payParams,
  plugin,
  payToken
}) {
  const [ destinationAccount, _sharedSecret ] = payParams
  debug('streaming via STREAM. destination=' + destinationAccount)

  const sharedSecret = Buffer.from(_sharedSecret, 'base64')
  const connection = await createConnection({
    plugin,
    destinationAccount,
    sharedSecret
  })  

  const stream = connection.createStream()
  stream.setSendMax(opts.maxPrice)

  await new Promise(resolve => stream.on('data', resolve))

  const result = await fetch(url, opts)

  if (stream.isOpen()) {
    stream.end()
  }

  return result
}

module.exports = streamPayment
