/* eslint-env mocha */
'use strict'

const assert = require('assert')
const assertThrows = require('./assertThrows')
const ValueObject = require('..')

describe('An array property', function() {
  it('can be instantiated with an array of primitive type', () => {
    class FooWithArray extends ValueObject.define({ codes: ['number'] }) {}
    const thing = new FooWithArray({ codes: [2, 3] })
    assert.deepEqual(thing.codes, [2, 3])
  })

  it('can be defined with Array type', () => {
    class FooWithArray extends ValueObject.define({ codes: Array }) {}
    const thing = new FooWithArray({ codes: [2, 3] })
    assert.deepEqual(thing.codes, [2, 3])
  })

  it('can be instantiated with an empty array of primitives', () => {
    class FooWithArray extends ValueObject.define({ codes: ['number'] }) {}
    const thing = new FooWithArray({ codes: [] })
    assert.deepEqual(thing.codes, [])
  })

  it('can be instantiated with an array of instances of a class', () => {
    class Child {}
    class FooWithArray extends ValueObject.define({ children: [Child] }) {}
    const children = [new Child()]
    const thing = new FooWithArray({ children })
    assert.deepStrictEqual(thing.children, children)
  })

  it('can be instantiated with an array of instances of a subclass of a class', function() {
    class Child {}
    class Grandchild extends Child {}
    class FooWithArray extends ValueObject.define({ children: [Child] }) {}
    const children = [new Grandchild()]
    const thing = new FooWithArray({ children })
    assert.deepStrictEqual(thing.children, children)
  })

  it('can be instantiated with an empty array', function() {
    class Child {}
    class FooWithArray extends ValueObject.define({ children: [Child] }) {}
    const children = []
    const thing = new FooWithArray({ children })
    assert.deepStrictEqual(thing.children, children)
  })

  it('fails when instantiated with a non-array value', function() {
    class Foo extends ValueObject.define({ things: ['string'] }) {}
    assertThrows(
      () => new Foo({ things: 666 }),
      'Foo was constructed with invalid property values\n' +
        '  Expected: { things:[string] }\n' +
        '  Actual:   { things:number }\n' +
        '  things is invalid:\n' +
        '    Expected array, was number',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('fails if defined with empty array', function() {
    assertThrows(
      () => class FooWithEmptyArray extends ValueObject.define({ codes: [] }) {},
      'Expected array property definition with single type element',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('fails if definition array has more than one element', function() {
    assertThrows(
      () => class FooWithEmptyArray extends ValueObject.define({ codes: ['string', Object] }) {},
      'Expected array property definition with single type element',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })
})

describe('serialization', () => {
  it('can be serialized', () => {
    class Foo extends ValueObject.define({ x: 'number', y: 'string' }) {}

    const deserialize = ValueObject.deserializeForNamespaces([{ Foo }])

    const x = 666
    const y = 'banana'
    const foo = new Foo({ x, y })
    const serialized = JSON.stringify(foo)
    const deserialized = deserialize(serialized)
    assert.equal(deserialized.constructor, Foo)
    assert.equal(deserialized.x, 666)
    assert.equal(deserialized.y, 'banana')
  })

  it('can be serialized with a Date property', () => {
    class Foo extends ValueObject.define({ date: Date }) {}

    const deserialize = ValueObject.deserializeForNamespaces([{ Foo }])

    const dateJSON = '2016-06-25T15:43:04.323Z'
    const date = new Date(dateJSON)
    const foo = new Foo({ date })
    const serialized = JSON.stringify(foo)
    const deserialized = deserialize(serialized)
    assert.equal(deserialized.constructor, Foo)
    assert.equal(deserialized.date.getTime(), date.getTime())
  })

  it('ignores namespaces that are not immediate properties of the argument objects', () => {
    class Foo extends ValueObject.define({ x: 'string' }) {}
    function Namespaces() {}
    Namespaces.prototype.Foo = Foo

    const deserialize = ValueObject.deserializeForNamespaces([new Namespaces()])

    assertThrows(
      () => deserialize(JSON.stringify(new Foo({ x: 'yeah' }))),
      'Unable to deserialize an object with type "Foo". ' +
        'Make sure you register that constructor when building deserialize.'
    )
  })
})
