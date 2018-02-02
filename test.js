const plugin = require('ilp-plugin')()
const fetch = require('.')

fetch('https://alpha.unhash.io', {
  plugin,
  maxPrice: 100,
  method: 'POST',
  body: 'hello world'
})
  .then(r => r.json())
  .then(json => {
    console.log('json response:', json)
    process.exit(0)
  })
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
