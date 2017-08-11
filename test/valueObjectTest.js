/* eslint-env mocha */
'use strict'

const assert = require('assert')
const assertThrows = require('./assertThrows')
const ValueObject = require('../src/valueObject')

describe(ValueObject.name, () => {
  context('with named properties', () => {
    it('sets its properties to the constructor arguments', () => {
      class Named extends ValueObject.define({ a: 'string', b: 'string' }) {}

      const a = 'A'
      const b = 'B'
      const named = new Named({ b, a })
      assert.equal(named.a, 'A')
      assert.equal(named.b, 'B')
    })

    it('is equal to another value object with the same property values', () => {
      class Thing extends ValueObject.define({ foo: 'number' }) {}
      class Code extends ValueObject.define({ name: 'string' }) {}
      class Foo extends ValueObject.define({ prop1: 'string', prop2: Thing, codes: [Code] }) {}
      const foo1 = new Foo({ prop1: 'dave', prop2: new Thing({ foo: 2 }), codes: [new Code({ name: 'red' })] })
      const foo2 = new Foo({ prop1: 'dave', prop2: new Thing({ foo: 2 }), codes: [new Code({ name: 'red' })] })
      assert(foo1.isEqualTo(foo2))
    })

    it('is not equal to another value object of different type with the same property values', () => {
      class Foo extends ValueObject.define({ prop1: 'string' }) {}
      class Bar extends ValueObject.define({ prop1: 'string' }) {}
      assert(!new Foo({ prop1: 'dave' }).isEqualTo(new Bar({ prop1: 'dave' })))
    })

    it('is not equal to another value object with different property values', () => {
      class Foo extends ValueObject.define({ prop1: 'string' }) {}
      assert(!new Foo({ prop1: 'bob' }).isEqualTo(new Foo({ prop1: 'andy' })))
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

    it('allows null arguments', () => {
      class Named extends ValueObject.define({ value: 'string', list: ['number'] }) {}

      const named = new Named({ value: null, list: null })
      assert.equal(named.value, null)
    })

    it('does not allow setting new properties', () => {
      class Named extends ValueObject.define({ ok: 'string', ko: 'string' }) {}
      const named = new Named({ ok: 'yep', ko: 'hey' })

      assertThrows(
        () => named.dingbat = 'badger',
        "Cannot add property dingbat, object is not extensible"
      )
    })

    it('does not allow mutating existing properties', () => {
      class Named extends ValueObject.define({ ok: 'string', ko: 'string' }) {}
      const named = new Named({ ok: 'yep', ko: 'hey' })

      assertThrows(
        () => named.ok = 'badger',
        "Cannot assign to read only property 'ok' of object '#<Named>'"
      )
    })

    it('does not allow undefined arguments', () => {
      class Named extends ValueObject.define({ ok: 'string', ko: ['string'] }) {}

      assertThrows(
        () => new Named({ ok: 'yep', ko: undefined }),
        'Named({ok:string, ko:[string]}) called with wrong types {ok:string, ko:undefined}'
      )
    })

    it('fails when instantiated with zero arguments', () => {
      class Named extends ValueObject.define({ b: 'string', a: ['string'] }) {}
      assertThrows(
        () => new Named(),
        'Named({b, a}) called with 0 arguments'
      )
    })

    it('fails when instantiated with more than one argument', () => {
      class Named extends ValueObject.define({ b: 'string', a: 'string' }) {}
      assertThrows(
        () => new Named({ a: 'ok' }, null),
        'Named({b, a}) called with 2 arguments'
      )
    })

    it('fails when instantiated without values for each property', () => {
      class WantsThreeProps extends ValueObject.define({ c: 'string', a: 'string', b: 'string' }) {}
      const a = 'A'
      const b = 'B'
      const d = 'D'
      assertThrows(
        () => new WantsThreeProps({ a, d, b }),
        'WantsThreeProps({c, a, b}) called with {a, d, b}'
      )
    })

    it('sets properties with different primitive types', () => {
      class Named extends ValueObject.define({ a: 'string', b: 'number', c: 'boolean' }) {}

      const a = 'A'
      const b = 3
      const c = false
      const named = new Named({ b, a, c })
      assert.equal(named.a, 'A')
      assert.equal(named.b, 3)
      assert.equal(named.c, false)
    })

    it('fails for primitive type when instantiated with the wrong type', () => {
      class Named extends ValueObject.define({ a: 'string', b: 'string' }) {}

      const a = 'A'
      const b = 3
      assertThrows(
        () => new Named({ b, a }),
        'Named({b:string, a:string}) called with wrong types {b:number, a:string}'
      )
    })

    it('fails for class type when instantiated with the wrong type', () => {
      class WrongChild {
      }
      class Child {
      }
      class Named extends ValueObject.define({ a: 'string', b: Child, c: 'string', d: 'boolean' }) {
      }

      const a = 'A'
      const b = new WrongChild()
      const c = null
      const d = false
      assertThrows(
        () => new Named({ b, a, c, d }),
        'Named({b:instanceof Child, a:string, c:string, d:boolean}) ' +
        'called with wrong types {b:instanceof WrongChild, a:string, c:null, d:boolean}'
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

    context('with array values', function() {
      it('can be instantiated with an array of primitives of certain type', () => {
        class NamedWithArray extends ValueObject.define({ codes: ['number'] }) {}
        const thing = new NamedWithArray({ codes: [2, 3] })
        assert.deepEqual(thing.codes, [2, 3])
      })

      it('can be instantiated with an array of instances of a class', () => {
        class Child {}
        class NamedWithArray extends ValueObject.define({ children: [Child] }) {}
        const children = [new Child()]
        const thing = new NamedWithArray({ children })
        assert.deepStrictEqual(thing.children, children)
      })

      it('can be instantiated with an array of instances of a subclass of a class', function() {
        class Child {}
        class Grandchild extends Child {}
        class NamedWithArray extends ValueObject.define({ children: [Child] }) {}
        const children = [new Grandchild()]
        const thing = new NamedWithArray({ children })
        assert.deepStrictEqual(thing.children, children)
      })

      it('can be instantiated with an empty array', function() {
        class Child {}
        class NamedWithArray extends ValueObject.define({ children: [Child] }) {}
        const children = []
        const thing = new NamedWithArray({ children })
        assert.deepStrictEqual(thing.children, children)
      })

      it('fails if defined with empty array', function() {
        assertThrows(
          () => class NamedWithEmptyArray extends ValueObject.define({ codes: [] }) {},
          'Expected an array to contain a single type element.'
        )
      })

      it('fails if definition array has more than one element', function() {
        assertThrows(
          () => class NamedWithEmptyArray extends ValueObject.define({ codes: ['string', Object] }) {},
          'Expected an array to contain a single type element.'
        )
      })
    })

    it('can be serialized', () => {
      class Named extends ValueObject.define({ x: 'number', y: 'string' }) {}

      const deserialize = ValueObject.deserializeForNamespaces([{ Named }])

      const x = 666
      const y = 'banana'
      const named = new Named({ x, y })
      const serialized = JSON.stringify(named)
      const deserialized = deserialize(serialized)
      assert.equal(deserialized.constructor, Named)
      assert.equal(deserialized.x, 666)
      assert.equal(deserialized.y, 'banana')
    })

    it('can be serialized with Date field', () => {
      class Named extends ValueObject.define({ date: Date }) {}

      const deserialize = ValueObject.deserializeForNamespaces([{ Named }])

      const dateJSON = '2016-06-25T15:43:04.323Z'
      const date = new Date(dateJSON)
      const named = new Named({ date })
      const serialized = JSON.stringify(named)
      const deserialized = deserialize(serialized)
      assert.equal(deserialized.constructor, Named)
      assert.equal(deserialized.date.getTime(), date.getTime())
    })

    it('can be extended', () => {
      class Base extends ValueObject {}
      Base.properties = { id: 'string', seq: 'number' }

      class Sub extends Base {}
      Sub.properties = { city: 'string', owner: 'string' }

      new Sub({ id: 'xyz', seq: 4, city: 'London', owner: 'Aslak' })
      assertThrows(
        () => new Sub({ seq: 4, city: 'London', owner: 'Aslak' }),
        'Sub({city, owner, id, seq}) called with {seq, city, owner}'
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

    describe('.toJSON()', () => {
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
    })
  })

  context('no properties defined', () => {
    it('cannot be instantiated', () => {
      class NoProperties extends ValueObject {
      }
      assertThrows(
        () => new NoProperties(),
        'ValueObjects must define static properties member'
      )
    })
  })

  describe('.with(newPropertyValues)', () => {
    it('creates a new value object overriding any stated values', () => {
      class MyValueObject extends ValueObject {}
      MyValueObject.properties = { propA: 'string', propB: 'number', propC: 'string' }
      const original = new MyValueObject({ propA: 'ZZ', propB: 123, propC: 'AA' })
      const overriding = original.with({ propA: 'YY', propB: 666 })
      assert.deepEqual(overriding, { propA: 'YY', propB: 666, propC: 'AA' })
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
  })

  describe('.validate()', () => {
    it('allows subclasses to add validation failures', () => {
      class Event extends ValueObject.define({ year: 'number' }) {
        addValidationFailures(failures) {
          if (this.year <= 0) {
            failures.for('year').add('must be > 0')
            failures.add('is invalid')
          }
        }

        throwValidationError(failures) {
          throw new Error('oh no: ' + failures.map(f => JSON.stringify(f)))
        }
      }
      const validEvent = new Event({ year: 2001 })
      validEvent.validate()
      const invalidEvent = new Event({ year: 0 })
      assertThrows(
        () => invalidEvent.validate(),
        'oh no: {"property":"year","message":"must be > 0"},{"message":"is invalid"}'
      )
    })

    it('allows subclasses to implement throwValidationError', () => {
      class MyValueObject extends ValueObject {
        throwValidationError(failures) {
          throw new Error('oh no: ' + failures.map(f => JSON.stringify(f)))
        }
      }
      class Event extends MyValueObject.define({ year: 'number' }) {
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
        'oh no: {"property":"year","message":"must be > 0"},{"message":"is invalid"}'
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
})
