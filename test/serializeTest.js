/* eslint-env mocha */
'use strict'

const assert = require('assert')
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
})
