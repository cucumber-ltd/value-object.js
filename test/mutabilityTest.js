/* eslint-env mocha */
'use strict'

const assert = require('assert')
const assertThrows = require('./assertThrows')
const ValueObject = require('..')

describe('new ValueObject({})', () => {
  it('does not allow setting new properties', () => {
    class Foo extends ValueObject.define({ ok: 'string', ko: 'string' }) {}
    const foo = new Foo({ ok: 'yep', ko: 'hey' })

    assertThrows(() => (foo.dingbat = 'badger'), /is not extensible/)
  })

  it('does not allow mutating existing properties', () => {
    class Foo extends ValueObject.define({ ok: 'string', ko: 'string' }) {}
    const foo = new Foo({ ok: 'yep', ko: 'hey' })

    assertThrows(() => (foo.ok = 'badger'), /read.only/)
  })

  describe('additional processing before freezing', () => {
    class Special extends ValueObject.define({ x: 'number' }) {
      _init() {
        Object.defineProperty(this, 'y', {
          value: this.x * 2,
          enumerable: true,
          writable: false
        })
      }
    }

    it('when constructing new object', () => {
      const special = new Special({ x: 0 })
      assert.equal(special.y, 0)
    })

    it('when using with', () => {
      const special = new Special({ x: 0 }).with({ x: 4 })
      assert.equal(special.y, 8)
    })
  })
})

describe('ValueObject.disableFreeze()', () => {
  it('disables freezing objects', () => {
    try {
      ValueObject.disableFreeze()
      class Foo extends ValueObject.define({ x: 'string' }) {}
      const foo = new Foo({ x: 'hello' })
      foo.z = 'yeah'
    } finally {
      ValueObject.enableFreeze()
    }
  })

  it('can be re-enabled with ValueObject.enableFreeze()', () => {
    try {
      ValueObject.disableFreeze()
      ValueObject.enableFreeze()
      class Foo extends ValueObject.define({ x: 'string' }) {}
      const foo = new Foo({ x: 'hello' })
      assertThrows(() => {
        foo.z = 'yeah'
      }, /not extensible/)
    } finally {
      ValueObject.enableFreeze()
    }
  })
})
