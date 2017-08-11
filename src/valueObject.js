'use strict'

const Schema = require('./schema')
const Serialization = require('./serialization')
const { ValidationFailures, ValidationError } = require('./validation')

class ValueObject {
  static define(properties) {
    if (this !== ValueObject) throw new Error('ValueObject.define() cannot be called on subclasses')
    Schema.validateArrayProperties(properties)
    const Subclass = class ValueObject extends this {}
    Subclass.properties = properties
    return Subclass
  }

  static get allProperties() {
    let ctor = this
    let allProperties = {}
    while (ctor !== ValueObject) {
      Object.assign(allProperties, ctor.properties)
      ctor = Object.getPrototypeOf(ctor)
    }
    return allProperties
  }

  constructor() {
    new Schema(this.constructor.allProperties).assignPropertyValues(this, arguments)
    this._init()
    Object.freeze(this)
  }

  /**
   * Override this method if you need to do additional processing, such as adding additional properties
   * @private
   */
  _init() {
  }

  toJSON() {
    return Serialization.toJSON(this, ValueObject)
  }

  static fromJSON(raw) {
    return Serialization.fromJSON(raw, this.allProperties, this)
  }

  isEqualTo(otherValueObject) {
    return otherValueObject instanceof this.constructor &&
      JSON.stringify(this.toJSON()) == JSON.stringify(otherValueObject.toJSON())
  }

  validate() {
    const failures = new ValidationFailures()
    this.addValidationFailures(failures)
    if (failures.any())
      throw new ValidationError(this, failures)
  }

  addValidationFailures(/* failures */) {
    // override this in subclasses e.g:
    // failures.for('someProperty').add('Some message')
  }

  with(newPropertyValues) {
    return this.constructor.fromJSON(Object.assign(this.toJSON(), newPropertyValues))
  }

  static deserializeForNamespaces(namespaces) {
    return Serialization.deserializeForNamespaces(namespaces)
  }
}

class Scalar extends ValueObject.define({ value: 'string' }) {
  /**
   * A scalar can be constructed with a string or an object {value: somestring}. The
   * former is for convenience, the latter for deserialisation
   * @param value string or object
   */
  constructor(value) {
    if (typeof value == 'string')
      super({ value })
    else
      super(value)
  }

  valueOf() {
    return this.value
  }

  inspect(_, options) {
    if (options.stylize)
      return `${this.constructor.name} { value: '${options.stylize(this.value, 'string')}' }`
    else
      return `${this.constructor.name} { value: '${this.value}' }`
  }

  get uriEncoded() {
    return encodeURI(this.value)
  }

  get uriComponentEncoded() {
    return encodeURIComponent(this.value)
  }

  get queryEncoded() {
    return this.uriComponentEncoded.replace(/%20/g, '+')
  }
}

ValueObject.Scalar = Scalar

module.exports = ValueObject
