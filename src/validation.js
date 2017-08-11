'use strict'

class ValidationFailures {
  constructor() {
    this.failures = []
  }

  for(property) {
    return new ValidationFailuresForProperty(this, property)
  }

  add(failure) {
    this.failures.push(typeof failure == 'object' ? failure : new InvalidObject(failure))
    return this
  }

  any() {
    return this.failures.length > 0
  }

  map() {
    return this.failures.map.apply(this.failures, arguments)
  }

  describe() {
    return this.map(failure => failure.describe()).join(', ')
  }
}

class ValidationFailuresForProperty {
  constructor(failures, property) {
    this.failures = failures
    this.property = property
  }

  add(message) {
    this.failures.add(new InvalidProperty(this.property, message))
    return this
  }
}

class InvalidObject {
  constructor(message) {
    this.message = message
  }

  describe() {
    return this.message
  }
}

class InvalidProperty {
  constructor(property, message) {
    this.property = property
    this.message = message
  }

  describe() {
    return `${this.property} ${this.message}`
  }
}

class ValidationError extends Error {
  constructor(object, failures) {
    super(`${object.constructor.name} is invalid: ${failures.describe()}`)
    Error.captureStackTrace(this, ValidationError)
    this.object = object
    this.failures = failures
  }
}

module.exports = {
  ValidationFailures,
  ValidationError
}
