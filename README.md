# ILP Fetch
> Simple paid HTTP request library for Interledger. Based on [node-fetch](https://www.npmjs.com/package/node-fetch).

- [Usage](#usage)
  - [Example](#example)
- [Test](#test)
- [Browser Support](#in-the-browser)

## Usage

The ILP Fetch API supports all the options that are present in the [node-fetch
API](https://github.com/bitinn/node-fetch#api).

Two additional fields are added:

- `plugin`: The ILP plugin used to make payments.
- `maxPrice`: The maximum, in the plugin's base units, which ILP fetch will send.

### Example

The below example will upload a file containing `hello world` to Unhash
(content-addressed storage on top of ILP).

```js
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
```

## Test

First run [Moneyd](https://github.com/interledgerjs/moneyd) on your machine. Then:

```
git clone https://github.com/interledgerjs/ilp-fetch.git
cd ilp-fetch
npm install
DEBUG=* node test.js
```

## In the Browser

Because ILP fetch is based around Fetch, it is possible for it to run in the
browser. Because of the restricted use of headers and cross-origin requests
(and because it is not possible to access moneyd from within a webpage), it may
not be useful in an ordinary webpage.

However, in the evironment of an extension it can be useful to make
payment-enabled requests. Additionally, an extension should have no problems
making cross-origin requests or accessing moneyd.

Just add the following block to your webpack config:

```
  externals: {
    'node-fetch': 'fetch'
  }
```
