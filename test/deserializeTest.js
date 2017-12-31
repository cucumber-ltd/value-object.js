/* eslint-env mocha */
'use strict'

const assert = require('assert')
const assertThrows = require('./assertThrows')
const ValueObject = require('..')

describe('ValueObject.deserializeForNamespaces([{}, {}])', () => {
  it('Builds a deserialize function', () => {
    class Foo {
      constructor({ bar }) {
        this.bar = bar
      }
    }
    class Bar {
      constructor({ baz }) {
        this.baz = baz
      }
    }
    const deserialize = ValueObject.deserializeForNamespaces([{ Foo, Bar }])
    const json = JSON.stringify({ __type__: 'Foo', bar: { __type__: 'Bar', baz: 42 } })
    const foo = deserialize(json)
    assert.equal(foo.constructor, Foo)
    assert.equal(foo.bar.constructor, Bar)
    assert.equal(foo.bar.baz, 42)
  })

  it('throws when a constructor is undefined', () => {
    assertThrows(() => ValueObject.deserializeForNamespaces([{}, undefined]),
      'One of your namespaces is undefined.'
    )
  })

  describe('.deserialize(json)', () => {
    it('throws when a constructor is missing', () => {
      const deserialize = ValueObject.deserializeForNamespaces([])
      assertThrows(() => deserialize(
        '{ "__type__": "Junk" }'),
        'Unable to deserialize an object with type "Junk". Make sure you register that constructor when building deserialize.'
      )
    })
  })
})

describe('new ValueObject()', () => {
  it("Creates ValueObject instances from nested values without __type__ annotations", () => {
    class B extends ValueObject.define({
      o: 'string'
    }) {}
    class A extends ValueObject.define({
      x: 'string',
      y: B
    }) {}
    const props = { x: '123', y: { o: '2' } }
    const object = new A(props)
    assert.deepEqual(object, props)
    assert.equal(object.constructor, A)
    assert.equal(object.y.constructor, B)
  })

  it("Creates ValueObject instances from nested values with array properties without __type__ annotations", () => {
    class B extends ValueObject.define({
      o: 'string'
    }) {}
    class A extends ValueObject.define({
      x: 'string',
      y: B,
      z: [B]
    }) {}
    const props = { x: '123', y: { o: '2' }, z: [{ o: '3' }, { o: '4' }] }
    const object = new A(props)
    assert.deepEqual(object, props)
    assert.equal(object.constructor, A)
    assert.equal(object.y.constructor, B)
    assert.equal(object.z[0].constructor, B)
    assert.equal(object.z[1].constructor, B)
  })
})
