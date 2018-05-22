const fetch = require('.')

fetch('http://localhost:8090', {
  maxPrice: 10000,
  method: 'GET'
})
  .then(r => r.text())
  .then(json => {
    console.log('json response:', json)
    process.exit(0)
  })
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
