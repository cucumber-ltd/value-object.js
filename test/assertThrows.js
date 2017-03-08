'use strict'

const assert = require('assert')

function assertThrows(fn, message) {
  try {
    fn()
    throw new Error('Should have thrown an error')
  } catch (err) {
    assert(typeof err !== 'undefined', 'threw undefined!')
    assert.equal(err.message, message)
  }
}

module.exports = assertThrows
