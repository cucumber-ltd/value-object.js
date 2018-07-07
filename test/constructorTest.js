/* eslint-env mocha */
'use strict'

const assert = require('assert')
const assertThrows = require('./assertThrows')
const ValueObject = require('..')

describe('ValueObject#constructor(properties)', () => {
  it('sets its properties to the constructor arguments', () => {
    class Foo extends ValueObject.define({ a: 'string', b: 'string' }) {}

    const a = 'A'
    const b = 'B'
    const foo = new Foo({ b, a })
    assert.equal(foo.a, 'A')
    assert.equal(foo.b, 'B')
  })

  it('sets properties of nested types to the nested constructor arguments', () => {
    const Foo = ValueObject.define({ x: { y: { z: 'string' } } })
    const foo = new Foo({ x: { y: { z: 'golly' } } })
    assert.equal(foo.x.y.z, 'golly')
  })

  it('allows null property values', () => {
    class X {}
    class Foo extends ValueObject.define({
      text: 'string',
      truthy: 'boolean',
      numeric: 'number',
      list: ['number'],
      x: X,
      y: { x: 'string' }
    }) {}

    const foo = new Foo({ text: null, truthy: null, numeric: null, list: null, x: null, y: null })
    assert.strictEqual(foo.text, null)
    assert.strictEqual(foo.truthy, null)
    assert.strictEqual(foo.numeric, null)
    assert.strictEqual(foo.list, null)
    assert.strictEqual(foo.x, null)
    assert.strictEqual(foo.y, null)
  })

  it('does not allow undefined property values for primitive properties', () => {
    class Foo extends ValueObject.define({ a: 'string', b: 'string' }) {}

    assertThrows(
      () => new Foo({ a: 'yep', b: undefined }),
      'Foo was constructed with invalid property values\n' +
        '  Expected: { a:string, b:string }\n' +
        '  Actual:   { a:string, b:undefined }\n' +
        '  b is invalid:\n' +
        '    Expected string, was undefined',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('does not allow undefined property values for nested struct properties', () => {
    class Foo extends ValueObject.define({ a: { b: 'string' } }) {}

    assertThrows(
      () => new Foo({ a: undefined }),
      'Foo was constructed with invalid property values\n' +
        '  Expected: { a:{ b:string } }\n' +
        '  Actual:   { a:undefined }\n' +
        '  a is invalid:\n' +
        '    Expected Struct, was undefined',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('does not allow undefined property values in nested constructors', () => {
    class Baz extends ValueObject.define({ a: 'string' }) {}
    class Bar extends ValueObject.define({ baz: Baz }) {}
    class Foo extends ValueObject.define({ bar: Bar }) {}

    assertThrows(
      () => new Foo({ bar: new Bar({ baz: undefined }) }),
      'Bar was constructed with invalid property values\n' +
        '  Expected: { baz:Baz }\n' +
        '  Actual:   { baz:undefined }\n' +
        '  baz is invalid:\n' +
        '    Expected Baz, was undefined',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('fails when instantiated with zero arguments', () => {
    class Foo extends ValueObject.define({ b: 'string', a: ['string'] }) {}
    assertThrows(
      () => new Foo(),
      'Foo was constructed with invalid property values\n' +
        '  Expected: { b:string, a:[string] }\n' +
        '  Actual:   0 arguments',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('fails when instantiated with more than one argument', () => {
    class Foo extends ValueObject.define({ b: 'string', a: 'string' }) {}
    assertThrows(
      () => new Foo({ a: 'ok' }, null),
      'Foo was constructed with invalid property values\n' +
        '  Expected: { b:string, a:string }\n' +
        '  Actual:   2 arguments',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('fails when instantiated without a value for every property', () => {
    class WantsThreeProps extends ValueObject.define({ c: 'string', a: 'string', b: 'string' }) {}
    const a = 'A'
    const b = 'B'
    const d = 'D'
    assertThrows(
      () => new WantsThreeProps({ a, d, b }),
      'WantsThreeProps was constructed with invalid property values\n' +
        '  Expected: { c:string, a:string, b:string }\n' +
        '  Actual:   { a:string, b:string, d:string }\n' +
        '  d is invalid:\n' +
        '    Property is unexpected\n' +
        '  c is invalid:\n' +
        '    Property is missing',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('fails when instantiated without a value for every nested property', () => {
    class WantsNestedProps extends ValueObject.define({ x: { y: 'string' } }) {}
    assertThrows(
      () => new WantsNestedProps({ x: {} }),
      'WantsNestedProps was constructed with invalid property values\n' +
        '  Expected: { x:{ y:string } }\n' +
        '  Actual:   { x:object }\n' +
        '  x is invalid:\n' +
        '    Struct was constructed with invalid property values\n' +
        '      Expected: { y:string }\n' +
        '      Actual:   {  }\n' +
        '      y is invalid:\n' +
        '        Property is missing',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('fails when instantiated without a string for nested value type property', () => {
    class WantsNestedProps extends ValueObject.define({ x: { y: 'string' } }) {}
    assertThrows(
      () => new WantsNestedProps({ x: 'zomg' }),
      'WantsNestedProps was constructed with invalid property values\n' +
        '  Expected: { x:{ y:string } }\n' +
        '  Actual:   { x:string }\n' +
        '  x is invalid:\n' +
        '    Expected Struct, was string',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('fails when instantiated with unexpected properties', () => {
    class WantsOneProp extends ValueObject.define({ a: 'string' }) {}
    const a = 'A'
    assertThrows(
      () => new WantsOneProp({ a, b: '1', c: '2' }),
      'WantsOneProp was constructed with invalid property values\n' +
        '  Expected: { a:string }\n' +
        '  Actual:   { a:string, b:string, c:string }\n' +
        '  b is invalid:\n' +
        '    Property is unexpected\n' +
        '  c is invalid:\n' +
        '    Property is unexpected',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('fails when instantiated with constructor properties whose constructors throw', () => {
    const constructorError = new Error('oh noes')
    class Bad extends ValueObject.define({ x: 'string' }) {
      constructor() {
        throw constructorError
      }
    }
    class HasBadProps extends ValueObject.define({ a: Bad, b: Bad }) {}
    assertThrows(() => new HasBadProps({ a: {}, b: {} }), constructorError.message, error =>
      assert.equal(error, constructorError)
    )
  })

  it('does not allow invalid dates', () => {
    class Foo extends ValueObject.define({ date: Date }) {}
    const date = new Date('2014-25-23') // Invalid date

    assertThrows(
      () => new Foo({ date }),
      'Foo was constructed with invalid property values\n' +
        '  Expected: { date:Date }\n' +
        '  Actual:   { date:Date }\n' +
        '  date is invalid:\n' +
        '    Invalid Date',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('does not allow objects as dates', () => {
    class Foo extends ValueObject.define({ date: Date }) {}
    const date = { time: 7654241 }

    assertThrows(
      () => new Foo({ date }),
      'Foo was constructed with invalid property values\n' +
        '  Expected: { date:Date }\n' +
        '  Actual:   { date:object }\n' +
        '  date is invalid:\n' +
        '    Expected Date, string or number, was object',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('allows nested types to be serialized as strings in JSON', () => {
    class Foo extends ValueObject.define({ a: 'number' }) {
      static fromJSON(json) {
        return { a: Number(json) }
      }

      toJSON() {
        return this.a.toString()
      }
    }
    class Bar extends ValueObject.define({ x: { y: Foo } }) {}
    const instance = new Bar({ x: { y: '123' } })
    const json = JSON.stringify(instance.toJSON())
    assert.equal(json, '{"x":{"y":"123","__type__":"Struct"},"__type__":"Bar"}')
    const deserialized = new Bar(JSON.parse(json))
    assert.equal(deserialized.x.y.a, 123)
  })

  it('allows nested types to be serialized as arbitrary objects in JSON', () => {
    class Foo extends ValueObject.define({ a: 'number' }) {
      static fromJSON(json) {
        return { a: Number(json.zz) }
      }

      toJSON() {
        return { zz: this.a }
      }
    }
    class Bar extends ValueObject.define({ x: { y: Foo } }) {}
    const instance = new Bar({ x: { y: new Foo({ a: 123 }) } })
    const json = JSON.stringify(instance.toJSON())
    assert.equal(json, '{"x":{"y":{"zz":123},"__type__":"Struct"},"__type__":"Bar"}')
    const deserialized = new Bar(JSON.parse(json))
    assert.equal(deserialized.x.y.a, 123)
  })

  it('sets properties with different primitive types', () => {
    class Foo extends ValueObject.define({ a: 'string', b: 'number', c: 'boolean' }) {}

    const a = 'A'
    const b = 3
    const c = false
    const foo = new Foo({ b, a, c })
    assert.equal(foo.a, 'A')
    assert.equal(foo.b, 3)
    assert.equal(foo.c, false)
  })

  it('sets object properties to object values', () => {
    class Foo extends ValueObject.define({ a: 'object' }) {}
    const a = { what: 'ever' }
    const foo = new Foo({ a })
    assert.equal(foo.a, a)
  })

  it('sets "any" properties to string values', () => {
    class Foo extends ValueObject.define({ a: 'any' }) {}
    const a = 'whatever'
    const foo = new Foo({ a })
    assert.equal(foo.a, a)
  })

  it('sets "any" properties to object values', () => {
    class Foo extends ValueObject.define({ a: 'any' }) {}
    const a = { what: 'ever' }
    const foo = new Foo({ a })
    assert.equal(foo.a, a)
  })

  it('sets "any" properties to array values', () => {
    class Foo extends ValueObject.define({ a: 'any' }) {}
    const a = ['howdy']
    const foo = new Foo({ a })
    assert.deepEqual(foo.a, a)
  })

  it('fails for primitive type when instantiated with the wrong type', () => {
    class Foo extends ValueObject.define({ a: 'number', b: 'string' }) {}

    const a = 'A'
    const b = 3
    assertThrows(
      () => new Foo({ b, a }),
      'Foo was constructed with invalid property values\n' +
        '  Expected: { a:number, b:string }\n' +
        '  Actual:   { a:string, b:number }\n' +
        '  a is invalid:\n' +
        '    Expected number, was string\n' +
        '  b is invalid:\n' +
        '    Expected string, was number',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('fails for untyped array when instantiated with the wrong type', () => {
    class Foo extends ValueObject.define({ a: Array }) {}

    assertThrows(
      () => new Foo({ a: new Date() }),
      'Foo was constructed with invalid property values\n' +
        '  Expected: { a:Array }\n' +
        '  Actual:   { a:Date }\n' +
        '  a is invalid:\n' +
        '    Expected array, was Date',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('sets properties to subtypes', () => {
    class Parent {}
    class Child extends Parent {}
    class Foo extends ValueObject.define({ x: Parent }) {}
    const child = new Child()
    const foo = new Foo({ x: child })
    assert.strictEqual(foo.x, child)
  })

  it('fails for class type when instantiated with the wrong type', () => {
    class WrongChild {}
    class Child {}
    class Foo extends ValueObject.define({
      a: 'string',
      b: Child,
      c: 'string',
      d: 'boolean',
      e: 'any'
    }) {}

    const a = 'A'
    const b = new WrongChild()
    const c = null
    const d = false
    const e = null
    assertThrows(
      () => new Foo({ b, a, c, d, e }),
      'Foo was constructed with invalid property values\n' +
        '  Expected: { a:string, b:Child, c:string, d:boolean, e:any }\n' +
        '  Actual:   { a:string, b:WrongChild, c:null, d:boolean, e:null }\n' +
        '  b is invalid:\n' +
        '    Expected Child, was WrongChild',
      error => assert(error instanceof ValueObject.ValueObjectError)
    )
  })

  it('fails for multiple invalid types with error explaining which properties', () => {
    class X {}
    const a = 666
    const b = new Date()
    const c = [1, undefined, undefined]
    class Foo extends ValueObject.define({ a: 'string', b: X, c: ['number'] }) {}
    assertThrows(
      () => new Foo({ a, b, c }),
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

  it('can be instantiated with a class child', () => {
    class Child {}
    class Parent extends ValueObject.define({ child: Child }) {}

    const child = new Child()
    const parent = new Parent({ child })
    assert.deepStrictEqual(parent.child, child)
  })

  it('can be instantiated with a subclass of a class child', () => {
    class Child {}
    class Grandchild extends Child {}
    class Parent extends ValueObject.define({ child: Child }) {}

    const grandchild = new Grandchild()
    const parent = new Parent({ child: grandchild })
    assert.deepStrictEqual(parent.child, grandchild)
  })

  it('can be instantiated with another value object of the same type', () => {
    class Foo extends ValueObject.define({ x: 'string' }) {}
    const foo = new Foo({ x: 'yeah' })
    const bar = new Foo(foo)
    assert.equal(bar.x, 'yeah')
  })
})
