/* eslint-env mocha */
'use strict'

const assert = require('assert')
const { Scalar } = require('../valueObject')

describe(Scalar.name, () => {
  it('can be constructed with a value', () => {
    class Name extends Scalar {}
    const name = new Name('Bobby')
    assert.equal(name.value, 'Bobby')
  })

  it('can be constructed with an object with { value: "the value" }', () => {
    class Name extends Scalar {}
    const name = new Name({ value: 'Boulders' })
    assert.equal(name.value, 'Boulders')
  })

  describe('.valueOf()', () => {
    it('returns the value', () => {
      class Name extends Scalar {}
      const name = new Name({ value: 'Spanner' })
      assert.equal(name.valueOf(), 'Spanner')
    })
  })

  describe('.uriEncoded', () => {
    it('returns the value as URI encoded', () => {
      class Drink extends Scalar {}
      const drink = new Drink('Mad Dog 20/20')
      assert.equal(drink.uriEncoded, 'Mad%20Dog%2020/20')
    })
  })

  describe('.uriComponentEncoded', () => {
    it('returns the value as URI component encoded', () => {
      class Drink extends Scalar {}
      const drink = new Drink('Mad Dog 20/20')
      assert.equal(drink.uriComponentEncoded, 'Mad%20Dog%2020%2F20')
    })
  })

  describe('.queryEncoded', () => {
    it('returns the value as query string encoded', () => {
      class Drink extends Scalar {}
      const drink = new Drink('Mad Dog 20/20')
      assert.equal(drink.queryEncoded, 'Mad+Dog+20%2F20')
    })
  })

  describe('.inspect(_, options)', () => {
    context('when options.stylize does not exist', () => {
      it('returns constructor.name { value: "the value" }', () => {
        class Score extends Scalar {}
        const score = new Score('666')
        const inspected = score.inspect(undefined, {})
        assert.equal(inspected, "Score { value: '666' }")
      })
    })

    context('when options.stylize is a function', () => {
      it('includes the stylized value as a string', () => {
        class Score extends Scalar {}
        const score = new Score('999')
        const inspected = score.inspect(undefined, {
          stylize: input => `[ ${input} ]`
        })
        assert.equal(inspected, "Score { value: '[ 999 ]' }")
      })
    })
  })
})
