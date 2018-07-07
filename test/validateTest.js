/* eslint-env mocha */
'use strict'

const assertThrows = require('./assertThrows')
const ValueObject = require('..')

describe('ValueObject#validate()', () => {
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
    assertThrows(() => invalidEvent.validate(), 'Event is invalid: year must be > 0, is invalid')
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
