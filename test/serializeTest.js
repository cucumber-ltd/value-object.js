/* eslint-env mocha */
'use strict'

const assert = require('assert')
const assertThrows = require('./assertThrows')
const ValueObject = require('..')

describe('ValueObject#toJSON()', () => {
  it('Is used by JSON.stringify() to create a nested anonymous object with __type__ members', () => {
    class Bar extends ValueObject.define({ baz: 'string' }) {}
    class Foo extends ValueObject.define({ bar: Bar }) {}
    const stringified = JSON.stringify(new Foo({ bar: new Bar({ baz: 'yeah' }) }))
    const parsed = JSON.parse(stringified)
    assert.deepEqual(parsed, {
      __type__: 'Foo',
      bar: { __type__: 'Bar', baz: 'yeah' }
    })
  })

  it('Creates a nested anonymous object with __type__ members', () => {
    class Bar extends ValueObject.define({ baz: 'string' }) {}
    class Foo extends ValueObject.define({ bar: Bar }) {}
    const serialized = new Foo({ bar: new Bar({ baz: 'yeah' }) }).toJSON()
    assert.deepEqual(serialized, {
      __type__: 'Foo',
      bar: { __type__: 'Bar', baz: 'yeah' }
    })
  })

  it('does not call the constructor when fromJSON returns an instance of the constructor', () => {
    let calls = 0
    function LocalDate(parts) {
      this.parts = parts
      calls++
    }
    LocalDate.prototype.toJSON = function() {
      return this.parts.join('-')
    }
    LocalDate.fromJSON = function(string) {
      return new LocalDate(string.split('-'))
    }

    var Booking = ValueObject.define({
      arrival: { date: LocalDate }
    })

    var jsonBooking = new Booking({
      arrival: { date: '2018-12-12' }
    }).toJSON()

    assert.equal(calls, 1)
    var rehydratedBooking = new Booking(jsonBooking)
    assert(rehydratedBooking.arrival.date instanceof LocalDate)
    assert.equal(calls, 2)
  })
})

describe('ValueObject.deserializeForNamespaces([ { TypeA }, { TypeB } ])', () => {
  it('deserializes types in strings created with JSON.stringify', () => {
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

  it('deserializes Date properties', () => {
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

  it('includes inherited properties', () => {
    class Base extends ValueObject.define({ propA: 'string' }) {}
    class Sub extends Base {
      static get schema() {
        return super.schema.extend({ propB: 'string' })
      }
    }

    const propA = 'AA'
    const propB = 'BB'
    const object = new Sub({ propA, propB })
    const json = object.toJSON()
    assert.deepEqual(json, { propA, propB, __type__: 'Sub' })
  })

  it('clones instances', () => {
    class Foo {
      constructor(x) {
        this.x = x
      }
    }
    class Bar extends ValueObject.define({ foo: Foo }) {}
    const foo = new Foo(666)
    const bar = new Bar({ foo })
    const json = bar.toJSON()
    assert.equal(json.foo.x, 666)
    json.foo.x = 888
    assert.equal(foo.x, 666)
  })

  it('calls toJSON on each element of a typed Array property', () => {
    class B extends ValueObject.define({ y: 'string' }) {}
    class A extends ValueObject.define({ x: [B] }) {}
    const a = new A({ x: [new B({ y: 'z' })] })
    assert.deepEqual(a.toJSON(), {
      x: [{ y: 'z', __type__: 'B' }],
      __type__: 'A'
    })
  })

  it('calls toJSON on each element of an untyped Array property', () => {
    class A extends ValueObject.define({ x: Array }) {}
    class B extends ValueObject.define({ y: 'string', z: Array }) {}
    const a = new A({
      x: [
        1,
        'good',
        new B({ y: 'fff', z: null }),
        {
          toJSON() {
            return 'ok'
          }
        }
      ]
    })
    assert.deepEqual(a.toJSON(), {
      x: [1, 'good', { y: 'fff', z: null, __type__: 'B' }, 'ok'],
      __type__: 'A'
    })
  })

  it('allows null values', () => {
    class Bar extends ValueObject.define({ y: 'number' }) {}
    class Foo extends ValueObject.define({
      a: 'string',
      b: Bar,
      c: 'object',
      d: { x: 'number' }
    }) {}
    const json = new Foo({ a: null, b: null, c: null, d: null }).toJSON()
    assert.strictEqual(json.a, null)
    assert.strictEqual(json.b, null)
    assert.strictEqual(json.c, null)
    assert.strictEqual(json.d, null)
  })

  it('allows null values for typed arrays', () => {
    class X extends ValueObject.define({ y: ['number'] }) {}
    const json = new X({ y: null }).toJSON()
    assert.strictEqual(json.y, null)
  })

  it('serializes arrays of primitives', () => {
    class X extends ValueObject.define({ y: ['string'] }) {}
    const x = new X({ y: ['yeah'] })
    const json = x.toJSON()
    assert.strictEqual(json.y[0], 'yeah')
    json.y[0] = 'no'
    assert.strictEqual(x.y[0], 'yeah')
  })
})

describe('#toPlainObject()', () => {
  it('converts the value object to plain object without __type__ members', () => {
    class X extends ValueObject.define({ a: 'number' }) {}
    class Y extends ValueObject.define({ b: [X], c: [{ d: 'number' }] }) {}

    const x = new X({ a: 1 })
    const y = new Y({ b: [x, null], c: [{ d: null }] })

    assert.equal(JSON.stringify(y.toPlainObject()), '{"b":[{"a":1},null],"c":[{"d":null}]}')
  })

  it('converts untyped array properties', () => {
    class X extends ValueObject.define({ a: Array, b: Array }) {}

    const x = new X({ a: [new X({ a: null, b: [] })], b: [1, 2] })

    assert.equal(JSON.stringify(x.toPlainObject()), '{"a":[{"a":null,"b":[]}],"b":[1,2]}')
  })

  it('converts null values of untyped array properties', () => {
    class X extends ValueObject.define({ a: Array }) {}

    const x = new X({ a: null })

    assert.equal(JSON.stringify(x.toPlainObject()), '{"a":null}')
  })

  it('converts null values of typed array properties', () => {
    class X extends ValueObject.define({ a: ['string'] }) {}

    const x = new X({ a: null })

    assert.equal(JSON.stringify(x.toPlainObject()), '{"a":null}')
  })

  it('converts null values of Schema properties', () => {
    class X extends ValueObject.define({ a: 'string' }) {}
    class Y extends ValueObject.define({ b: X, c: { d: 'string' } }) {}

    const y = new Y({ b: null, c: null })

    assert.equal(JSON.stringify(y.toPlainObject()), '{"b":null,"c":null}')
  })

  it('converts constructor properties', () => {
    function X() {
      this.z = 'hi'
    }
    class Y extends ValueObject.define({ x: X }) {}

    const y = new Y({ x: new X() })

    assert.equal(JSON.stringify(y.toPlainObject()), '{"x":{"z":"hi"}}')
  })

  it('converts null values for typed array properties', () => {
    class X extends ValueObject.define({ y: ['number'] }) {}
    const object = new X({ y: null }).toPlainObject()
    assert.strictEqual(object.y, null)
  })

  it('serializes arrays of primitives', () => {
    class X extends ValueObject.define({ y: ['string'] }) {}
    const x = new X({ y: ['yeah'] })
    const plain = x.toPlainObject()
    assert.strictEqual(plain.y[0], 'yeah')
    plain.y[0] = 'no'
    assert.strictEqual(x.y[0], 'yeah')
  })

  it.only('does not call the constructor when fromJSON returns an instance of the constructor', () => {
    let calls = 0
    function LocalDate(parts) {
      this.parts = parts
      calls++
    }
    LocalDate.prototype.toJSON = function() {
      return this.parts.join('-')
    }
    LocalDate.fromJSON = function(string) {
      return new LocalDate(string.split('-'))
    }

    var Booking = ValueObject.define({
      arrival: { date: LocalDate }
    })

    var plainBooking = new Booking({
      arrival: { date: '2018-12-12' }
    }).toPlainObject()

    assert.equal(calls, 1)
    var rehydratedBooking = new Booking(plainBooking)
    assert(rehydratedBooking.arrival.date instanceof LocalDate)
    assert.equal(calls, 2)
  })

  it('leaves object values intact (does not attemtp to serialize them)', function() {
    class A {
      constructor (p) {
        this.p = p
      }
      toJSON() {
        return 'Aaa'
      }
    }
    class X extends ValueObject.define({
      y1: A,
      y2: [A],
      y3: [{z3: A}],
      y4: [{z4: [A]}],
      y5: {z5: A}
    }) {}
    const x = new X({
      y1: new A('p1'),
      y2: [new A('p2')],
      y3: [{z3: new A('p3')}],
      y4: [{z4: [new A('p4')]}],
      y5: {z5: new A('p5')}
    })
    const plain = x.toPlainObject()
    assert.deepEqual(plain, {
      y1: {p: 'p1'},
      y2: [{p: 'p2'}],
      y3: [{z3: {p: 'p3'}}],
      y4: [{z4: [{p: 'p4'}]}],
      y5: {z5: {p: 'p5'}}
    })
  })
})
