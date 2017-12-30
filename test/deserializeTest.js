/* eslint-env mocha */
'use strict'

const assert = require('assert')
const assertThrows = require('./assertThrows')
const ValueObject = require('../valueObject')

describe(ValueObject.deserializeForNamespaces.name, () => {
  it('Builds a deserialize function that can turn a JSON representation of an object', () => {
    class Foo {
      constructor(bar) {
        this.bar = bar
      }
      static fromJSON(json) {
        return new Foo(json.bar)
      }
    }
    class Bar {
      constructor(baz) {
        this.baz = baz
      }
      static fromJSON(json) {
        return new Bar(json.baz)
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

    it('throws when a the type has no static toJSON method', () => {
      class Bad {}
      const deserialize = ValueObject.deserializeForNamespaces([{ Bad }])
      assertThrows(() => deserialize(
        '{ "__type__": "Bad" }'),
        'Unable to deserialize an object with type "Bad". Deserializable types must have a static fromJSON method.'
      )
    })
  })

  describe('ValueObject.fromJSON(serializedProperties)', () => {
    it('creates an instance of the ValueObject from the serialized properties', () => {
      class ExampleValueObject extends ValueObject.define({
        date1: Date,
        date2: Date,
        string1: 'string',
        string2: 'string'
      }) {}
      const props = {
        date1: new Date('2001-01-01'),
        date2: null,
        string1: 'lollipop',
        string2: null
      }
      const object = ExampleValueObject.fromJSON(props)
      assert.deepEqual(object, props)
    })
  })
})

describe('ValueObject.fromJSON()', () => {
  it("Creates ValueObject instances from nested values without __type__ annotations", () => {
    class B extends ValueObject.define({
      o: 'string'
    }) {}
    class A extends ValueObject.define({
      x: 'string',
      y: B
    }) {}
    const props = { x: '123', y: { o: '2' } }
    const object = A.fromJSON(props)
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
    const object = A.fromJSON(props)
    assert.deepEqual(object, props)
    assert.equal(object.constructor, A)
    assert.equal(object.y.constructor, B)
    assert.equal(object.z[0].constructor, B)
    assert.equal(object.z[1].constructor, B)
  })
})
