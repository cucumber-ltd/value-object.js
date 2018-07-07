/* eslint-env mocha */
'use strict'

const assert = require('assert')
const ValueObject = require('..')

describe('ValueObject#isEqualTo(other)', () => {
  it('is equal to another value object with equal property values', () => {
    class Thing extends ValueObject.define({ foo: 'number' }) {}
    class Code extends ValueObject.define({ name: 'string' }) {}
    class Foo extends ValueObject.define({ p1: 'string', p2: Thing, p3: 'any', codes: [Code] }) {}
    const foo1 = new Foo({
      p1: 'dave',
      p2: new Thing({ foo: 2 }),
      p3: 42,
      codes: [new Code({ name: 'red' })]
    })
    const foo2 = new Foo({
      p1: 'dave',
      p2: new Thing({ foo: 2 }),
      p3: 42,
      codes: [new Code({ name: 'red' })]
    })
    assert(foo1.isEqualTo(foo2))
  })

  it('is not equal to another value object of different type with equal property values', () => {
    class Foo extends ValueObject.define({ p1: 'string' }) {}
    class Bar extends ValueObject.define({ p1: 'string' }) {}
    assert(!new Foo({ p1: 'dave' }).isEqualTo(new Bar({ p1: 'dave' })))
  })

  it('is not equal to another value object of the same type but an overridden schema with equal property values', () => {
    class Foo extends ValueObject.define({ prop1: 'string' }) {}
    class Bar extends Foo {
      static get schema() {
        return super.schema.extend({ prop2: 'string' })
      }
    }
    assert(new Bar({ prop1: '1', prop2: '2' }).isEqualTo(new Bar({ prop1: '1', prop2: '2' })))
  })

  it('is equal to another value object with equal string property values', () => {
    class Foo extends ValueObject.define({ prop1: 'string' }) {}
    assert(new Foo({ prop1: 'ok' }).isEqualTo(new Foo({ prop1: 'ok' })))
  })

  it('is not equal to another value object with different string property values', () => {
    class Foo extends ValueObject.define({ prop1: 'string' }) {}
    assert(!new Foo({ prop1: 'bob' }).isEqualTo(new Foo({ prop1: 'andy' })))
  })

  it('is equal to another value object with equal any property values', () => {
    class Foo extends ValueObject.define({ prop1: 'any' }) {}
    assert(new Foo({ prop1: 'ok' }).isEqualTo(new Foo({ prop1: 'ok' })))
  })

  it('is not equal to another value object with different any property values', () => {
    class Foo extends ValueObject.define({ prop1: 'any' }) {}
    assert(!new Foo({ prop1: 'bob' }).isEqualTo(new Foo({ prop1: 'andy' })))
  })

  it('is equal to another value object with equal boolean property values', () => {
    class Foo extends ValueObject.define({ prop1: 'boolean' }) {}
    assert(new Foo({ prop1: true }).isEqualTo(new Foo({ prop1: true })))
  })

  it('is not equal to another value object with different boolean property values', () => {
    class Foo extends ValueObject.define({ prop1: 'boolean' }) {}
    assert(!new Foo({ prop1: true }).isEqualTo(new Foo({ prop1: false })))
  })

  it('is equal to another value object with equal number property values', () => {
    class Foo extends ValueObject.define({ prop1: 'number' }) {}
    assert(new Foo({ prop1: 123 }).isEqualTo(new Foo({ prop1: 123.0 })))
  })

  it('is not equal to another value object with different number property values', () => {
    class Foo extends ValueObject.define({ prop1: 'number' }) {}
    assert(!new Foo({ prop1: 321 }).isEqualTo(new Foo({ prop1: 345 })))
  })

  it('is equal to another value object with equal Date property values', () => {
    class Foo extends ValueObject.define({ prop1: Date }) {}
    assert(
      new Foo({ prop1: new Date('2020-01-01') }).isEqualTo(
        new Foo({ prop1: new Date('2020-01-01') })
      )
    )
  })

  it('is not equal to another value object with equal Date property values', () => {
    class Foo extends ValueObject.define({ prop1: Date }) {}
    assert(
      !new Foo({ prop1: new Date('2020-01-01') }).isEqualTo(
        new Foo({ prop1: new Date('2020-01-02') })
      )
    )
  })

  it('is equal to another value object with equal object property values', () => {
    class Foo extends ValueObject.define({ prop1: 'object' }) {}
    assert(new Foo({ prop1: { x: 123 } }).isEqualTo(new Foo({ prop1: { x: 123 } })))
  })

  it('is not equal to another value object with different object property values', () => {
    class Foo extends ValueObject.define({ prop1: 'object' }) {}
    assert(!new Foo({ prop1: { x: 456 } }).isEqualTo(new Foo({ prop1: { x: 654 } })))
  })

  it('is equal to another value object with same constructor property values', () => {
    function X() {}
    const x = new X()
    class Foo extends ValueObject.define({ prop1: X }) {}
    assert(new Foo({ prop1: x }).isEqualTo(new Foo({ prop1: x })))
  })

  it('is equal to another value object with equal schema property values', () => {
    class Foo extends ValueObject.define({ prop1: { prop2: 'string' } }) {}
    assert(new Foo({ prop1: { prop2: 'yes' } }).isEqualTo(new Foo({ prop1: { prop2: 'yes' } })))
  })

  it('is equal to another value object with null schema property values', () => {
    class Foo extends ValueObject.define({ prop1: { prop2: 'string' } }) {}
    assert(new Foo({ prop1: { prop2: null } }).isEqualTo(new Foo({ prop1: { prop2: null } })))
  })

  it('is not equal to another value object with different schema property values', () => {
    class Foo extends ValueObject.define({ prop1: { prop2: 'string' } }) {}
    assert(!new Foo({ prop1: { prop2: 'yes' } }).isEqualTo(new Foo({ prop1: { prop2: 'no' } })))
  })

  it('is not equal to another value object with a null schema property value', () => {
    class Foo extends ValueObject.define({ prop1: { prop2: 'string' } }) {}
    assert(!new Foo({ prop1: { prop2: 'yes' } }).isEqualTo(new Foo({ prop1: null })))
  })

  it('is not equal to another value object with a schema property value when it has a null value', () => {
    class Foo extends ValueObject.define({ prop1: { prop2: 'string' } }) {}
    assert(!new Foo({ prop1: null }).isEqualTo(new Foo({ prop1: { prop2: 'yes' } })))
  })

  it('is not equal to another value object with different constructor property values', () => {
    function X() {}
    const x1 = new X()
    const x2 = new X()
    class Foo extends ValueObject.define({ prop1: X }) {}
    assert(!new Foo({ prop1: x1 }).isEqualTo(new Foo({ prop1: x2 })))
  })

  it('is not equal to another object', () => {
    class Foo extends ValueObject.define({ prop1: 'string' }) {}
    assert(!new Foo({ prop1: 'bob' }).isEqualTo({}))
  })

  it('is not equal to a primitive', () => {
    class Foo extends ValueObject.define({ prop1: 'string' }) {}
    assert(!new Foo({ prop1: 'bob' }).isEqualTo(67565))
  })

  it('is not equal to undefined', () => {
    class Foo extends ValueObject.define({ prop1: 'string' }) {}
    assert(!new Foo({ prop1: 'bob' }).isEqualTo(undefined))
  })

  it('is equal to another object with equal array elements', () => {
    class Foo extends ValueObject.define({ a: ['number'] }) {}
    assert(new Foo({ a: [1, 2] }).isEqualTo(new Foo({ a: [1, 2] })))
  })

  it('is not equal to another object with a different number of array elements', () => {
    class Foo extends ValueObject.define({ a: ['number'] }) {}
    assert(!new Foo({ a: [1] }).isEqualTo(new Foo({ a: [1, 2] })))
  })

  it('is not equal to another object with differently ordered array elements', () => {
    class Foo extends ValueObject.define({ a: ['number'] }) {}
    assert(!new Foo({ a: [2, 1] }).isEqualTo(new Foo({ a: [1, 2] })))
  })

  it('is equal to another object with untyped array with same values', () => {
    class Foo extends ValueObject.define({ a: Array }) {}
    assert(new Foo({ a: [2, 1, null] }).isEqualTo(new Foo({ a: [2, 1, null] })))
  })

  it('is not equal to another object with untyped array with different values', () => {
    class Foo extends ValueObject.define({ a: Array }) {}
    assert(!new Foo({ a: [2, 1] }).isEqualTo(new Foo({ a: [1, 2] })))
  })

  it('is not equal to another object with untyped array with more values', () => {
    class Foo extends ValueObject.define({ a: Array }) {}
    assert(!new Foo({ a: [1, 2] }).isEqualTo(new Foo({ a: [1, 2, 3] })))
  })

  it('is not equal to another object with untyped array with fewer values', () => {
    class Foo extends ValueObject.define({ a: Array }) {}
    assert(!new Foo({ a: [1, 2, 3] }).isEqualTo(new Foo({ a: [1, 2] })))
  })

  it('is equal to another object with untyped array with a null value', () => {
    class Foo extends ValueObject.define({ a: Array }) {}
    assert(new Foo({ a: null }).isEqualTo(new Foo({ a: null })))
  })

  it('is equal to another object with untyped array with no elements', () => {
    class Foo extends ValueObject.define({ a: Array }) {}
    assert(new Foo({ a: [] }).isEqualTo(new Foo({ a: [] })))
  })

  it('is equal to another object with untyped array with equal value object elements', () => {
    class Bar extends ValueObject.define({ b: 'string' }) {}
    class Foo extends ValueObject.define({ a: Array }) {}
    assert(new Foo({ a: [new Bar({ b: 'q' })] }).isEqualTo(new Foo({ a: [new Bar({ b: 'q' })] })))
  })

  it('is not equal to another object with untyped array with non-equal value object elements', () => {
    class Bar extends ValueObject.define({ b: 'string' }) {}
    class Foo extends ValueObject.define({ a: Array }) {}
    assert(!new Foo({ a: [new Bar({ b: 'q' })] }).isEqualTo(new Foo({ a: [new Bar({ b: 'x' })] })))
  })

  it('is equal to another object with untyped array with value object elements with equal date members', () => {
    class Bar extends ValueObject.define({ b: Date }) {}
    class Foo extends ValueObject.define({ a: Array }) {}
    assert(
      new Foo({ a: [new Bar({ b: new Date('2020-01-01') })] }).isEqualTo(
        new Foo({ a: [new Bar({ b: new Date('2020-01-01') })] })
      )
    )
  })
})
