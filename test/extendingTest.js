/* eslint-env mocha */
'use strict'

const assert = require('assert')
const assertThrows = require('./assertThrows')
const ValueObject = require('..')

describe('A defined ValueObject', () => {
  it('can be subclassed', () => {
    class Base extends ValueObject.define({ id: 'string', seq: 'number' }) {}

    class Sub extends Base {
      static get schema() {
        return super.schema.extend({ city: 'string', owner: 'string' })
      }
    }

    new Sub({ id: 'xyz', seq: 4, city: 'London', owner: 'Aslak' })
    assertThrows(
      () => new Sub({ seq: 4, city: 'London', owner: 'Aslak' }),
      'Sub was constructed with invalid property values\n' +
        '  Expected: { id:string, seq:number, city:string, owner:string }\n' +
        '  Actual:   { seq:number, city:string, owner:string }\n' +
        '  id is invalid:\n' +
        '    Property is missing',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('calls the constructor of each superclass', () => {
    class Top extends ValueObject.define({ x: 'string' }) {
      constructor(args) {
        super(Object.assign({ x: '1' }, args))
      }
    }

    class Middle extends Top {
      constructor(args) {
        super(Object.assign({ y: '2' }, args))
      }

      static get schema() {
        return super.schema.extend({ y: 'string' })
      }
    }

    class Bottom extends Middle {
      constructor() {
        super({ z: '3' })
      }

      static get schema() {
        return super.schema.extend({ z: 'string' })
      }
    }

    const bottom = new Bottom()
    assert.equal(bottom.x, '1')
    assert.equal(bottom.y, '2')
    assert.equal(bottom.z, '3')
  })

  it('can be subclassed many times', () => {
    class Top extends ValueObject.define({ x: 'string' }) {}

    class B1 extends Top {
      static get schema() {
        return super.schema.extend({ y: 'string' })
      }
    }

    class B2 extends Top {
      static get schema() {
        return super.schema.extend({ z: 'string' })
      }
    }

    const b1 = new B1({ x: 'X', y: 'Y' })
    const b2 = new B2({ x: 'X', z: 'Z' })
    assert.equal(b1.y, 'Y')
    assert.equal(b2.z, 'Z')
  })

  it('accepts new property type definitions', () => {
    ValueObject.definePropertyType('money', () => ({
      coerce(value) {
        const parts = value.split(' ')
        return { value: { amount: Number(parts[0]), currency: parts[1] } }
      },

      areEqual(a, b) {
        return a.currency == b.currency && a.amount == b.amount
      }
    }))
    const Allowance = ValueObject.define({ cash: 'money' })
    const allowance = new Allowance({ cash: '123.00 GBP' })
    assert.equal(allowance.cash.amount, 123)
    assert.equal(allowance.cash.currency, 'GBP')
    assert(allowance.isEqualTo(allowance))
    assert(!allowance.isEqualTo(allowance.with({ cash: '321.00 GBP' })))
  })
})
