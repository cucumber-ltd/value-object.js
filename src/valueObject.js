'use strict'

const Schema = require('./schema')
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
    return toJSON(this)
  }

  static fromJSON(raw) {
    const args = Object.assign({}, raw)
    delete args.__type__
    for (const propertyName in this.allProperties) {
      if (this.allProperties[propertyName] == Date) {
        args[propertyName] = new Date(args[propertyName])
      }
    }
    return new this(args)
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
    const constructors = namespaces.reduce((ctors, namespace) => {
      if (!namespace)
        throw new Error('One of your namespaces is undefined.')

      return Object.assign(ctors, namespace)
    }, {})

    return (json) => JSON.parse(json, revive)

    function revive(key, value) {
      if (!value || !value.__type__) return value

      const constructor = constructors[value.__type__]

      if (!constructor)
        throw new Error(`Unable to deserialize an object with type "${value.__type__}".` +
        " Make sure you register that constructor when building deserialize.")
      if (typeof constructor.fromJSON !== 'function')
        throw new Error(`Unable to deserialize an object with type "${value.__type__}".` +
        " Deserializable types must have a static fromJSON method.")

      return constructor.fromJSON(value)
    }
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

function toJSON(valueObject) {
  const serialized = {
    __type__: valueObject.constructor.name
  }
  const properties = {}
  let ctor = valueObject.constructor
  while (ctor !== ValueObject) {
    Object.keys(ctor.properties).forEach(p => properties[p] = true)
    ctor = Object.getPrototypeOf(ctor)
  }
  for (const propertyName of Object.keys(properties)) {
    serialized[propertyName] = serializeValue(valueObject[propertyName])
  }
  return serialized
}

function serializeValue(value) {
  return value instanceof Date ? value.toISOString() : value
}

ValueObject.Scalar = Scalar

module.exports = ValueObject
