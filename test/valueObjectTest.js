/* eslint-env mocha */
'use strict'

const assert = require('assert')
const assertThrows = require('./assertThrows')
const ValueObject = require('..')

describe('ValueObject', () => {

  describe('.define(definition)', () => {
    it('defines simple types', () => {
      const Currency = ValueObject.define({ code: 'string' })
      const gbp = new Currency({ code: 'GBP' })
      assert.equal('GBP', gbp.code)
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
        "Property defined as unsupported type (number)",
        error => assert(error instanceof ValueObject.ValueObjectError)
      )
    })

    it('can be used to extend existing ValueObjects', () => {
      class A extends ValueObject.define({ x: 'string' }) {}
      class B extends A.define({ y: 'string' }) {}
      const b = new B({ x: 'foo', y: 'bar' })
      assert.equal(b.x, 'foo')
      assert.equal(b.y, 'bar')
      assert(b instanceof B)
      assert(b instanceof A)
    })

    it('preserves static members of extended ValueObjects', () => {
      class A extends ValueObject.define({ x: 'string' }) {
        static bibble() {
          return 'bobble ' + this.name
        }
      }
      class B extends A {
        static wibble() {
          return 'wobble ' + this.name
        }
      }
      class C extends B.define({ y: 'string' }) {}
      B.fibble = 'fobble'
      assert.equal(B.bibble(), 'bobble B')
      assert.equal(B.wibble(), 'wobble B')
      assert.equal(B.fibble, 'fobble')
      assert.equal(C.bibble(), 'bobble C')
      assert.equal(C.wibble(), 'wobble C')
    })
  })

  describe('#constructor(properties)', () => {
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

    it('does not allow undefined property values', () => {
      class Foo extends ValueObject.define({ a: 'string', b: 'string' }) {}

      assertThrows(
        () => new Foo({ a: 'yep', b: undefined }),
        'Foo({a:string, b:string}) called with invalid types {a:string, b:undefined} - "b" is invalid (Expected string, was undefined)',
        error => assert(error instanceof ValueObject.ValueObjectError)
      )
    })

    it('does not allow undefined property values in nested constructors', () => {
      class Baz extends ValueObject.define({ a: 'string' }) {}
      class Bar extends ValueObject.define({ baz: Baz }) {}
      class Foo extends ValueObject.define({ bar: Bar }) {}

      assertThrows(
        () => new Foo({ bar: new Bar({ baz: undefined }) }),
        'Bar({baz:Baz}) called with invalid types {baz:undefined} - "baz" is invalid (Expected Baz, was undefined)',
        error => assert(error instanceof ValueObject.ValueObjectError)
      )
    })

    it('fails when instantiated with zero arguments', () => {
      class Foo extends ValueObject.define({ b: 'string', a: ['string'] }) {}
      assertThrows(
        () => new Foo(),
        'Foo({b:string, a:[string]}) called with 0 arguments',
        error => assert(error instanceof ValueObject.ValueObjectError)
      )
    })

    it('fails when instantiated with more than one argument', () => {
      class Foo extends ValueObject.define({ b: 'string', a: 'string' }) {}
      assertThrows(
        () => new Foo({ a: 'ok' }, null),
        'Foo({b:string, a:string}) called with 2 arguments',
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
        'WantsThreeProps({c:string, a:string, b:string}) called with {a, d, b} ("c" is missing, "d" is unexpected)',
        error => assert(error instanceof ValueObject.ValueObjectError)
      )
    })

    it('fails when instantiated without a value for every nested property', () => {
      class WantsNestedProps extends ValueObject.define({ x: { y: 'string' } }) {}
      assertThrows(
        () => new WantsNestedProps({ x: {} }),
        'WantsNestedProps({x:{y:string}}) called with invalid types {x:object} - ' +
        '"x" is invalid (Struct({y:string}) called with {} ("y" is missing))',
        error => assert(error instanceof ValueObject.ValueObjectError)
      )
    })

    it('fails when instantiated without a string for nested value type property', () => {
      class WantsNestedProps extends ValueObject.define({ x: { y: 'string' } }) {}
      assertThrows(
        () => new WantsNestedProps({ x: 'zomg' }),
        'WantsNestedProps({x:{y:string}}) called with invalid types {x:string} - ' +
        '"x" is invalid (Struct({y:string}) called with string (expected object))',
        error => assert(error instanceof ValueObject.ValueObjectError)
      )
    })

    it('fails when instantiated with unexpected properties', () => {
      class WantsOneProp extends ValueObject.define({ a: 'string' }) {}
      const a = 'A'
      assertThrows(
        () => new WantsOneProp({ a, b: '1', c: '2' }),
        'WantsOneProp({a:string}) called with {a, b, c} ("b" is unexpected, "c" is unexpected)',
        error => assert(error instanceof ValueObject.ValueObjectError)
      )
    })

    it('does not allow invalid dates', () => {
      class Foo extends ValueObject.define({ date: Date }) {}
      const date = new Date('2014-25-23') // Invalid date

      assertThrows(
        () => new Foo({ date }),
        'Foo({date:Date}) called with invalid types {date:Date} - "date" is invalid (Invalid Date)',
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

    it('sets object properties', () => {
      class Foo extends ValueObject.define({ a: 'object' }) {}
      const a = { what: 'ever' }
      const foo = new Foo({ a })
      assert.equal(foo.a, a)
    })

    it('fails for primitive type when instantiated with the wrong type', () => {
      class Foo extends ValueObject.define({ a: 'number', b: 'string' }) {}

      const a = 'A'
      const b = 3
      assertThrows(
        () => new Foo({ b, a }),
        'Foo({a:number, b:string}) called with invalid types {a:string, b:number} - '+
        '"a" is invalid (Expected number, was string), "b" is invalid (Expected string, was number)',
        error => assert(error instanceof ValueObject.ValueObjectError)
      )
    })

    it('sets properties to subtypes', () => {
      class Parent {
      }
      class Child extends Parent {
      }
      class Foo extends ValueObject.define({ x: Parent }) {
      }
      const child = new Child()
      const foo = new Foo({ x: child })
      assert.strictEqual(foo.x, child)
    })

    it('fails for class type when instantiated with the wrong type', () => {
      class WrongChild {
      }
      class Child {
      }
      class Foo extends ValueObject.define({ a: 'string', b: Child, c: 'string', d: 'boolean' }) {
      }

      const a = 'A'
      const b = new WrongChild()
      const c = null
      const d = false
      assertThrows(
        () => new Foo({ b, a, c, d }),
        'Foo({a:string, b:Child, c:string, d:boolean}) ' +
        'called with invalid types {a:string, b:WrongChild, c:null, d:boolean} - '+
        '"b" is invalid (Expected Child, was WrongChild)',
        error => assert(error instanceof ValueObject.ValueObjectError)
      )
    })

    it('fails for multiple invalid types with error explaining which properties', () => {
      class X {}
      const a = 666
      const b = new Date()
      const c = -1
      class Foo extends ValueObject.define({ a: 'string', b: X, c: 'object' }) {
      }
      assertThrows(
        () => new Foo({ a, b, c }),
        'Foo({a:string, b:X, c:object}) ' +
        'called with invalid types {a:number, b:Date, c:number} - ' +
        '"a" is invalid (Expected string, was number), ' +
        '"b" is invalid (Expected X, was Date), ' +
        '"c" is invalid (Expected object, was number)',
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

  describe('#isEqualTo(other)', () => {
    it('is equal to another value object with the equal property values', () => {
      class Thing extends ValueObject.define({ foo: 'number' }) {}
      class Code extends ValueObject.define({ name: 'string' }) {}
      class Foo extends ValueObject.define({ prop1: 'string', prop2: Thing, codes: [Code] }) {}
      const foo1 = new Foo({ prop1: 'dave', prop2: new Thing({ foo: 2 }), codes: [new Code({ name: 'red' })] })
      const foo2 = new Foo({ prop1: 'dave', prop2: new Thing({ foo: 2 }), codes: [new Code({ name: 'red' })] })
      assert(foo1.isEqualTo(foo2))
    })

    it('is not equal to another value object of different type with equal property values', () => {
      class Foo extends ValueObject.define({ prop1: 'string' }) {}
      class Bar extends ValueObject.define({ prop1: 'string' }) {}
      assert(!new Foo({ prop1: 'dave' }).isEqualTo(new Bar({ prop1: 'dave' })))
    })

    it('is equal to another value object with equal string property values', () => {
      class Foo extends ValueObject.define({ prop1: 'string' }) {}
      assert(new Foo({ prop1: 'ok' }).isEqualTo(new Foo({ prop1: 'ok' })))
    })

    it('is not equal to another value object with different string property values', () => {
      class Foo extends ValueObject.define({ prop1: 'string' }) {}
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
      assert(new Foo({ prop1: 123 }).isEqualTo(new Foo({ prop1: 123.00 })))
    })

    it('is not equal to another value object with different number property values', () => {
      class Foo extends ValueObject.define({ prop1: 'number' }) {}
      assert(!new Foo({ prop1: 321 }).isEqualTo(new Foo({ prop1: 345 })))
    })

    it('is equal to another value object with equal object property values', () => {
      class Foo extends ValueObject.define({ prop1: 'object' }) {}
      assert(new Foo({ prop1: { x: 123 } }).isEqualTo(new Foo({ prop1: { x: 123 } })))
    })

    it('is not equal to another value object with different object property values', () => {
      class Foo extends ValueObject.define({ prop1: 'object' }) {}
      assert(!new Foo({ prop1: { x: 456 } }).isEqualTo(new Foo({ prop1: { x: 654 } })))
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
  })

  describe('mutability', () => {
    it('does not allow setting new properties', () => {
      class Foo extends ValueObject.define({ ok: 'string', ko: 'string' }) {}
      const foo = new Foo({ ok: 'yep', ko: 'hey' })

      assertThrows(
        () => foo.dingbat = 'badger',
        "Cannot add property dingbat, object is not extensible"
      )
    })

    it('does not allow mutating existing properties', () => {
      class Foo extends ValueObject.define({ ok: 'string', ko: 'string' }) {}
      const foo = new Foo({ ok: 'yep', ko: 'hey' })

      assertThrows(
        () => foo.ok = 'badger',
        "Cannot assign to read only property 'ok' of object '#<Foo>'"
      )
    })

    it('allows additional processing before freezing its property values', () => {
      class Special extends ValueObject.define({ x: 'number' }) {
        _init() {
          Object.defineProperty(this, 'y', {
            value: 123,
            enumerable: true,
            writable: false
          })
        }
      }
      const special = new Special({ x: 0 })
      assert.equal(special.y, 123)
    })
  })

  describe('extending', () => {
    it('can be subclassed', () => {
      class Base extends ValueObject {}
      Base.properties = { id: 'string', seq: 'number' }

      class Sub extends Base {}
      Sub.properties = { city: 'string', owner: 'string' }

      new Sub({ id: 'xyz', seq: 4, city: 'London', owner: 'Aslak' })
      assertThrows(
        () => new Sub({ seq: 4, city: 'London', owner: 'Aslak' }),
        'Sub({city:string, owner:string, id:string, seq:number}) called with {seq, city, owner} ("id" is missing)',
        error => assert(error instanceof ValueObject.ValueObjectError)
      )
    })

    it('accepts new property type definitions', () => {
      ValueObject.definePropertyType('money', {
        coerce(value) {
          const parts = value.split(' ')
          return { amount: Number(parts[0]), currency: parts[1] }
        },

        areEqual(a, b) {
          return a.currency == b.currency && a.amount == b.amount
        }
      })
      const Allowance = ValueObject.define({ cash: 'money' })
      const allowance = new Allowance({ cash: '123.00 GBP' })
      assert.equal(allowance.cash.amount, 123)
      assert.equal(allowance.cash.currency, 'GBP')
      assert(allowance.isEqualTo(allowance))
      assert(!allowance.isEqualTo(allowance.with({ cash: '321.00 GBP' })))
    })
  })

  context('with array values', function() {
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
        'Foo({things:[string]}) called with invalid types {things:number} - ' +
        '"things" is invalid (Expected array, was number)',
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
  })

  describe('#toJSON()', () => {
    it('includes inherited properties', () => {
      class Base extends ValueObject {}
      Base.properties = { propA: 'string' }
      class Sub extends Base {}
      Sub.properties = { propB: 'string' }

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
        x: [ { y: 'z', __type__: 'B' } ],
        __type__: 'A'
      })
    })

    it('calls toJSON on each element of an untyped Array property', () => {
      class A extends ValueObject.define({ x: Array }) {}
      class B extends ValueObject.define({ y: 'string' }) {}
      const a = new A({ x: [1, 'good', new B({ y: 'fff' }), { toJSON() { return 'ok' } }] })
      assert.deepEqual(a.toJSON(), {
        x: [ 1, 'good', { y: 'fff', __type__: 'B' }, 'ok' ],
        __type__: 'A'
      })
    })

    it('allows null values', () => {
      class Bar extends ValueObject.define({ y: 'number' }) {}
      class Foo extends ValueObject.define({ a: 'string', b: Bar, c: 'object', d: { x: 'number' } }) {}
      const json = new Foo({ a: null, b: null, c: null, d: null }).toJSON()
      assert.strictEqual(json.a, null)
      assert.strictEqual(json.b, null)
      assert.strictEqual(json.c, null)
      assert.strictEqual(json.d, null)
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
  })

  describe('#with(newPropertyValues)', () => {
    it('creates a new value object overriding any stated values', () => {
      class MyValueObject extends ValueObject {}
      MyValueObject.properties = { propA: 'string', propB: 'number', propC: 'string' }
      const original = new MyValueObject({ propA: 'ZZ', propB: 123, propC: 'AA' })
      const overriding = original.with({ propA: 'YY', propB: 666 })
      assert.deepEqual(overriding, { propA: 'YY', propB: 666, propC: 'AA' })
    })

    it('can be used on nested anonymous types', () => {
      class Z extends ValueObject.define({ x: { y: 'string' } }) {}
      const z = new Z({ x: { y: 'ok' }})
      assert.deepEqual(z.x.with({ y: 'no' }).y, 'no')
    })

    it('overrides inherited properties', () => {
      class Base extends ValueObject {}
      Base.properties = { propA: 'string', propB: 'number', propE: Date }
      class Sub extends Base {}
      Sub.properties = { propC: 'string', propD: 'number' }

      const date = new Date()
      const original = new Sub({ propA: 'ZZ', propB: 123, propC: 'AA', propD: 321, propE: date })
      const overriding = original.with({ propA: 'YY', propD: 666 })
      assert.deepEqual(overriding, { propA: 'YY', propB: 123, propC: 'AA', propD: 666, propE: date })
    })

    it('overrides inherited properties twice', () => {
      class Base extends ValueObject {}
      Base.properties = { propA: 'string', propB: 'number', propE: Date }
      class Sub extends Base {}
      Sub.properties = { propC: 'string', propD: 'number' }

      const date = new Date()
      const original = new Sub({ propA: 'ZZ', propB: 123, propC: 'AA', propD: 321, propE: date })
      const overriding = original.with({ propA: 'YY', propD: 666 }).with({ propD: 777, propE: null })
      assert.deepEqual(overriding, { propA: 'YY', propB: 123, propC: 'AA', propD: 777, propE: null })
    })

    it('throws when passed a non-existent property', () => {
      class Hello extends ValueObject {}
      Hello.properties = { x: 'string' }
      assertThrows(
        () => new Hello({ x: 'yo' }).with({ y: 'ok', z: 'good' }),
        'Hello({x:string}) called with {x, y, z} ("y" is unexpected, "z" is unexpected)'
      )
    })

    it('returns instances of the original type', () => {
      class Yo extends ValueObject {}
      Yo.properties = { x: 'string' }
      const yo = new Yo({ x: '1' }).with({ x: '2' })
      assert.equal(yo.constructor, Yo)
    })

    it('returns instances with schemas', () => {
      class Yo extends ValueObject {}
      Yo.properties = { x: 'string' }
      const yo = new Yo({ x: '1' }).with({ x: '2' })
      assert.deepEqual(yo.constructor.schema.propertyNames, ['x'])
    })
  })

  describe('#validate()', () => {
    it('allows subclasses to add validation failures', () => {
      class Event extends ValueObject.define({ year: 'number' }) {
        addValidationFailures(failures) {
          if (this.year <= 0) {
            failures.for('year').add('must be > 0')
            failures.add('is invalid')
          }
        }
      }
      const validEvent = new Event({ year: 2001 })
      validEvent.validate()
      const invalidEvent = new Event({ year: 0 })
      assertThrows(
        () => invalidEvent.validate(),
        'Event is invalid: year must be > 0, is invalid'
      )
    })

    it('does nothing by default', () => {
      class Day extends ValueObject.define({ name: 'string' }) {}
      const validDay = new Day({ name: 'Sunday' })
      validDay.validate()
    })

    it('implements `throwValidationError(failures)`', () => {
      class Holiday extends ValueObject.define({ name: 'string' }) {
        addValidationFailures(failures) {
          failures.add('it should be happier')
          failures.for('name').add('should be nicer')
        }
      }
      const invalidHoliday = new Holiday({ name: 'Pancake Day' })
      assertThrows(
        () => invalidHoliday.validate(),
        'Holiday is invalid: it should be happier, name should be nicer'
      )
    })
  })

  describe('{ define } = require("value-object")', () => {
    it('can define value objects', () => {
      const { define } = ValueObject
      const Foo = define({ x: "string" })
      new Foo({ x: 'yeah' })
    })
  })
})
