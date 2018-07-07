/* eslint-env mocha */
'use strict'

const assert = require('assert')
const assertThrows = require('./assertThrows')
const ValueObject = require('..')

describe('ValueObject#with(newPropertyValues)', () => {
  it('creates a new value object overriding specific property values', () => {
    class MyValueObject extends ValueObject.define({
      propA: 'string',
      propB: 'number',
      propC: 'string'
    }) {}
    const original = new MyValueObject({ propA: 'ZZ', propB: 123, propC: 'AA' })
    const overriding = original.with({ propA: 'YY', propB: 666 })
    assert.deepEqual(overriding, { propA: 'YY', propB: 666, propC: 'AA' })
  })

  it('overrides inherited properties', () => {
    class Base extends ValueObject.define({ propA: 'string', propB: 'number', propE: Date }) {}
    class Sub extends Base {
      static get schema() {
        return super.schema.extend({ propC: 'string', propD: 'number' })
      }
    }

    const date = new Date()
    const original = new Sub({ propA: 'ZZ', propB: 123, propC: 'AA', propD: 321, propE: date })
    const overriding = original.with({ propA: 'YY', propD: 666 })
    assert.deepEqual(overriding, {
      propA: 'YY',
      propB: 123,
      propC: 'AA',
      propD: 666,
      propE: date
    })
  })

  it('overrides inherited properties twice', () => {
    class Base extends ValueObject.define({ propA: 'string', propB: 'number', propE: Date }) {}
    class Sub extends Base {
      static get schema() {
        return super.schema.extend({ propC: 'string', propD: 'number' })
      }
    }

    const date = new Date()
    const original = new Sub({ propA: 'ZZ', propB: 123, propC: 'AA', propD: 321, propE: date })
    const overriding = original.with({ propA: 'YY', propD: 666 }).with({ propD: 777, propE: null })
    assert.deepEqual(overriding, {
      propA: 'YY',
      propB: 123,
      propC: 'AA',
      propD: 777,
      propE: null
    })
  })

  it('throws when passed a non-existent property', () => {
    class Hello extends ValueObject.define({ x: 'string' }) {}
    assertThrows(
      () => new Hello({ x: 'yo' }).with({ y: 'ok', z: 'good' }),
      'Hello was constructed with invalid property values\n' +
        '  Expected: { x:string }\n' +
        '  Actual:   { x:string, y:string, z:string }\n' +
        '  y is invalid:\n' +
        '    Property is unexpected\n' +
        '  z is invalid:\n' +
        '    Property is unexpected'
    )
  })

  it('returns instances of the original type', () => {
    class Yo extends ValueObject.define({ x: 'string' }) {}
    const yo = new Yo({ x: '1' }).with({ x: '2' })
    assert.equal(yo.constructor, Yo)
  })

  it('calls the original constructor', () => {
    class X extends ValueObject.define({ a: 'string' }) {
      constructor({ a }) {
        super({ a: a + '!' })
      }
    }
    const x = new X({ a: 'G' }).with({ a: 'H' })
    assert.equal(x.a, 'H!')
  })

  it('returns instances with schemas', () => {
    class Yo extends ValueObject.define({ x: 'string' }) {}
    const yo = new Yo({ x: '1' }).with({ x: '2' })
    assert.deepEqual(yo.constructor.schema.propertyNames, ['x'])
  })

  it('can be used on nested anonymous types', () => {
    class Z extends ValueObject.define({ x: { y: 'string' } }) {}
    const z = new Z({ x: { y: 'ok' } })
    assert.deepEqual(z.x.with({ y: 'no' }).y, 'no')
  })

  it('ignores properties that are not own properties of the argument object', () => {
    class Yo extends ValueObject.define({ x: 'string' }) {}
    function Super() {
      this.x = '2'
    }
    Super.prototype.zz = 'whatevs'
    new Yo({ x: '1' }).with(new Super())
  })

  it('fails when called with multiple invalid types with error explaining which properties', () => {
    class X {}
    const a = 666
    const b = new Date()
    const c = [1, undefined, undefined]
    class Foo extends ValueObject.define({ a: 'string', b: X, c: ['number'] }) {}
    const foo = new Foo({ a: 'ok', b: new X(), c: [1, 2, 3] })
    assertThrows(
      () => foo.with({ a, b, c }),
      'Foo was constructed with invalid property values\n' +
        '  Expected: { a:string, b:X, c:[number] }\n' +
        '  Actual:   { a:number, b:Date, c:Array }\n' +
        '  a is invalid:\n' +
        '    Expected string, was number\n' +
        '  b is invalid:\n' +
        '    Expected X, was Date\n' +
        '  c is invalid:\n' +
        '    [1] is invalid:\n' +
        '      Expected number, was undefined\n' +
        '    [2] is invalid:\n' +
        '      Expected number, was undefined',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('does not use .toPlainObject()', () => {
    class Money extends ValueObject.define({ amount: 'number', currency: 'string' }) {
      toPlainObject() {
        throw new Error('.with() should not use .toPlainObject()')
      }
    }

    const money = new Money({ amount: 100, currency: 'ZAR' })
    const newMoney = money.with({ amount: 200 })

    assert.deepEqual(newMoney, {
      amount: 200,
      currency: 'ZAR'
    })
  })
})
