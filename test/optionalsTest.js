/* eslint-env mocha */
'use strict'

const assert = require('assert')
const assertThrows = require('./assertThrows')
const ValueObject = require('..')

describe("A 'string?' property", () => {
  it("can declared as 'string?'", () => {
    const Thing = ValueObject.define({
      requiredProp: 'string',
      optionalProp: 'string?'
    })
    assert.strictEqual(Thing.schema.properties.requiredProp.optional, false)
    assert.strictEqual(Thing.schema.properties.optionalProp.optional, true)
  })

  it("can declared as ValueObject.optional('string')", () => {
    const Thing = ValueObject.define({
      requiredProp: 'string',
      optionalProp: ValueObject.optional('string')
    })
    assert.strictEqual(Thing.schema.properties.requiredProp.optional, false)
    assert.strictEqual(Thing.schema.properties.optionalProp.optional, true)
  })

  it('can be set to null', () => {
    const Thing = ValueObject.define({
      optionalProp: 'string?'
    })
    assert.strictEqual(new Thing({ optionalProp: null }).optionalProp, null)
  })

  it('can be set to undefined', () => {
    const Thing = ValueObject.define({
      optionalProp: 'string?'
    })
    assert.strictEqual(new Thing({ optionalProp: undefined }).optionalProp, undefined)
  })

  it('can be omitted', () => {
    const Thing = ValueObject.define({
      optionalProp: 'string?'
    })
    assert.strictEqual(new Thing({}).optionalProp, undefined)
  })

  it('is equal to a property of another object with an equal value', () => {
    const Thing = ValueObject.define({
      optionalProp: 'string?'
    })
    assert.strictEqual(
      new Thing({ optionalProp: 'zzz' }).isEqualTo(new Thing({ optionalProp: 'zzz' })),
      true
    )
  })

  it('does not allow assignment with a value of the incorrect type', () => {
    const Thing = ValueObject.define({
      optionalProp: 'string?'
    })
    assertThrows(
      () => new Thing({ optionalProp: 666 }),
      'ValueObject was constructed with invalid property values\n' +
        '  Expected: { optionalProp:string? }\n' +
        '  Actual:   { optionalProp:number }\n' +
        '  optionalProp is invalid:\n' +
        '    Expected string, was number'
    )
  })
})

describe("A 'number?' property", () => {
  it("can declared with 'number?'", () => {
    const Thing = ValueObject.define({
      requiredProp: 'number',
      optionalProp: 'number?'
    })
    assert.strictEqual(Thing.schema.properties.requiredProp.optional, false)
    assert.strictEqual(Thing.schema.properties.optionalProp.optional, true)
  })

  it("can declared with ValueObject.optional('number')", () => {
    const Thing = ValueObject.define({
      requiredProp: 'number',
      optionalProp: ValueObject.optional('number')
    })
    assert.strictEqual(Thing.schema.properties.requiredProp.optional, false)
    assert.strictEqual(Thing.schema.properties.optionalProp.optional, true)
  })

  it('can be set to null', () => {
    const Thing = ValueObject.define({
      optionalProp: 'number?'
    })
    assert.strictEqual(new Thing({ optionalProp: null }).optionalProp, null)
  })

  it('can be set to undefined', () => {
    const Thing = ValueObject.define({
      optionalProp: 'number?'
    })
    assert.strictEqual(new Thing({ optionalProp: undefined }).optionalProp, undefined)
  })

  it('can be omitted', () => {
    const Thing = ValueObject.define({
      optionalProp: 'number?'
    })
    assert.strictEqual(new Thing({}).optionalProp, undefined)
  })

  it('is equal to a property of another object with an equal value', () => {
    const Thing = ValueObject.define({
      optionalProp: 'number?'
    })
    assert.strictEqual(
      new Thing({ optionalProp: 123 }).isEqualTo(new Thing({ optionalProp: 123 })),
      true
    )
  })

  it('does not allow assignment with a value of the incorrect type', () => {
    const Thing = ValueObject.define({
      optionalProp: 'number?'
    })
    assertThrows(
      () => new Thing({ optionalProp: '666' }),
      'ValueObject was constructed with invalid property values\n' +
        '  Expected: { optionalProp:number? }\n' +
        '  Actual:   { optionalProp:string }\n' +
        '  optionalProp is invalid:\n' +
        '    Expected number, was string'
    )
  })
})

describe("a property declared as an optional array of 'string?' properties", () => {
  it("can declared with ValueObject.optional(['string?'])", () => {
    const Thing = ValueObject.define({
      requiredProp: 'string',
      optionalProp: ValueObject.optional(['string?'])
    })
    assert.strictEqual(Thing.schema.properties.requiredProp.optional, false)
    assert.strictEqual(Thing.schema.properties.optionalProp.optional, true)
    assert.strictEqual(
      Thing.schema.properties.optionalProp.constraint.constraint.elementConstraint.optional,
      true
    )
  })

  it('is equal to a property of another object with an array with equal values', () => {
    const Thing = ValueObject.define({
      optionalProp: ValueObject.optional(['string?'])
    })
    const options = {
      optionalProp: ['a', null, undefined, '666']
    }
    assert.strictEqual(new Thing(options).isEqualTo(new Thing(options)), true)
  })

  it('is not equal to a property of another object with an array with non-equal values', () => {
    const Thing = ValueObject.define({
      optionalProp: ValueObject.optional(['string?'])
    })
    const options1 = {
      optionalProp: [undefined, null]
    }
    const options2 = {
      optionalProp: [null, undefined]
    }
    assert.strictEqual(new Thing(options1).isEqualTo(new Thing(options2)), false)
  })
})

describe('a property declared as an array of optionals', () => {
  it("can declared with ['string?']", () => {
    const Thing = ValueObject.define({
      requiredProp: 'string',
      optionalProp: ['string?']
    })
    assert.strictEqual(Thing.schema.properties.requiredProp.optional, false)
    assert.strictEqual(Thing.schema.properties.optionalProp.optional, false)
    assert.strictEqual(
      Thing.schema.properties.optionalProp.constraint.elementConstraint.optional,
      true
    )
  })

  it("can declared with [ValueObject.optional('string')]", () => {
    const Thing = ValueObject.define({
      requiredProp: 'string',
      optionalProp: [ValueObject.optional('string')]
    })
    assert.strictEqual(Thing.schema.properties.requiredProp.optional, false)
    assert.strictEqual(Thing.schema.properties.optionalProp.optional, false)
    assert.strictEqual(
      Thing.schema.properties.optionalProp.constraint.elementConstraint.optional,
      true
    )
  })

  it('is equal to a property of another object with an array with equal values', () => {
    const Thing = ValueObject.define({
      optionalProp: ['string?']
    })
    const options = {
      optionalProp: ['a', null, undefined, '666']
    }
    assert.strictEqual(new Thing(options).isEqualTo(new Thing(options)), true)
  })

  it('is not equal to a property of another object with an array with non-equal values', () => {
    const Thing = ValueObject.define({
      optionalProp: ['string?']
    })
    const options1 = {
      optionalProp: [undefined, null]
    }
    const options2 = {
      optionalProp: [null, undefined]
    }
    assert.strictEqual(new Thing(options1).isEqualTo(new Thing(options2)), false)
  })
})
