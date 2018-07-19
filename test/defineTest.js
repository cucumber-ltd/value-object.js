/* eslint-env mocha */
'use strict'

const assert = require('assert')
const assertThrows = require('./assertThrows')
const ValueObject = require('..')

describe('.define(definition)', () => {
  it('defines simple types', () => {
    const Currency = ValueObject.define({ code: 'string' })
    const gbp = new Currency({ code: 'GBP' })
    assert.equal('GBP', gbp.code)
  })

  it('defines types with property metadata', () => {
    const Thing = ValueObject.define({
      foo: ValueObject.property('string', {
        description: 'the foo',
        flavour: 'spicy',
        spicy: true,
        yummy: false
      }),
      bar: ValueObject.property('string', {
        description: 'the bar',
        flavour: 'sweet'
      })
    })
    assert.deepEqual(
      { description: 'the foo', flavour: 'spicy', spicy: true, yummy: false },
      Thing.schema.properties.foo.metadata
    )
    assert.deepEqual(
      { description: 'the bar', flavour: 'sweet' },
      Thing.schema.properties.bar.metadata
    )
  })

  it('defines types with typed arrays with property metadata', () => {
    const Foo = ValueObject.define({ zzz: ValueObject.property('string', { blah: 'yeah' }) })
    const Thing = ValueObject.define({
      foo: [Foo]
    })
    assert.deepEqual(
      { blah: 'yeah' },
      Thing.schema.properties.foo.constraint.elementConstraint.schema.properties.zzz.metadata
    )
  })

  it('defines types with typed arrays with inline types with property metadata', () => {
    const Thing = ValueObject.define({
      foo: [{ zzz: ValueObject.property('string', { blah: 'yeah' }) }]
    })
    assert.deepEqual(
      { blah: 'yeah' },
      Thing.schema.properties.foo.constraint.elementConstraint.schema.properties.zzz.metadata
    )
  })

  it('defines types with nested anonymous types', () => {
    const Money = ValueObject.define({ amount: 'number', currency: { code: 'string' } })
    const allowance = new Money({ amount: 123, currency: { code: 'GBP' } })
    assert.equal('GBP', allowance.currency.code)
  })

  it('returns a constructor with a schema property', () => {
    const Foo = ValueObject.define({ x: 'string' })
    assert.deepEqual(Foo.schema.propertyNames, ['x'])
  })

  it('does not allow defining properties as numbers', () => {
    assertThrows(
      () => ValueObject.define({ x: 666 }),
      'Property defined as unsupported type (666)',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('does not allow defining properties as unrecognised type names', () => {
    assertThrows(
      () => ValueObject.define({ x: 'string  ' }),
      'Property defined as unsupported type ("string  ")',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })
})

describe('{ define } = require("value-object")', () => {
  it('can define value objects', () => {
    const { define } = ValueObject
    const Foo = define({ x: 'string' })
    new Foo({ x: 'yeah' })
  })
})

describe('ValueObjectSubclass.define()', () => {
  it('throws an error, because it is dangerous', () => {
    class Foo extends ValueObject.define({ x: 'string' }) {}
    assertThrows(() => Foo.define({ y: 'string' }), 'Foo.define is not a function')
  })
})
