'use strict'

const assert = require('assert')

function assertThrows(fn, message, expose = () => {}) {
  try {
    fn()
    throw new Error('Should have thrown an error')
  } catch (err) {
    assert(typeof err !== 'undefined', 'threw undefined!')
    if (message instanceof RegExp) {
      assert(err.message.match(message), 'Expected ' + message + ' to match:\n' + err.message)
    } else {
      assert.equal(err.message, message)
    }
    expose(err)
  }
}

module.exports = assertThrows
