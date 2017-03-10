'use strict'

const { ValidationFailures } = require('./validation')

class ValueObject {
  static define(properties) {
    const props = typeof properties == 'object' ? properties : [].slice.apply(arguments)
    const klass = class MyValueObject extends ValueObject {}
    klass.properties = props
    return klass
  }

  static get allProperties() {
    let ctor = this
    let allProperties = Array.isArray(this.properties) ? [] : {}
    while (ctor !== ValueObject) {
      if (Array.isArray(allProperties))
        allProperties = Array.from(new Set(allProperties.concat(ctor.properties)))
      else
        Object.assign(allProperties, ctor.properties)
      ctor = Object.getPrototypeOf(ctor)
    }
    return allProperties
  }

  constructor() {
    if (!('properties' in this.constructor)) throw new Error('ValueObjects must define static properties member')
    if (Array.isArray(this.constructor.properties)) {
      this._assignPositionalProperties(this.constructor.allProperties, arguments)
    } else {
      this._assignNamedProperties(this.constructor.allProperties, arguments)
    }
    this._init()
    Object.freeze(this)
  }

  /**
   * Override this method if you need to do additional processing, such as adding additional properties
   * @private
   */
  _init() {
  }

  _assignPositionalProperties(properties, args) {
    if (properties.length !== args.length) {
      const message = `${this.constructor.name}(${properties.join(', ')}) called with ${args.length} arguments`
      throw new TypeError(message)
    }

    properties.forEach((propertyName, position) => {
      const argument = args[position]
      if (argument === undefined) {
        const message = `${this.constructor.name}(${this.constructor.properties.join(', ')}) called with undefined for ${propertyName}`
        throw new TypeError(message)
      }
      Object.defineProperty(this, propertyName, {
        value: argument,
        enumerable: true,
        writable: false
      })
    })
  }

  _assignNamedProperties(properties, args) {
    // Check that the property names are the same
    const propertyValues = args[0] || {}
    const expectedPropertyNames = Object.keys(properties)
    const actualPropertyNames = Object.keys(propertyValues)
    if (args.length != 1) throw new TypeError(`${this.constructor.name}({${expectedPropertyNames.join(', ')}}) called with ${args.length} arguments`)

    const samePropertyNames = expectedPropertyNames.length == actualPropertyNames.length && expectedPropertyNames.every(propertyName => propertyName in propertyValues)
    if (!samePropertyNames) throw new TypeError(`${this.constructor.name}({${expectedPropertyNames.join(', ')}}) called with {${actualPropertyNames.join(', ')}}`)

    // Check that the property values are compatible
    let compatibleTypes = true
    const expectedTypeDescriptions = {}
    const argumentTypeDescriptions = {}
    for (const propertyName of expectedPropertyNames) {
      // Build error message for expected type
      const expectedType = properties[propertyName]
      expectedTypeDescriptions[propertyName] = typeof expectedType == 'function' ? 'instanceof ' + expectedType.name : expectedType
    }

    for (const propertyName of actualPropertyNames) {
      // Build error message for argument type
      const expectedType = properties[propertyName]
      const argument = propertyValues[propertyName]
      const argumentTypeName = typeof argument

      if (argument === undefined) {
        const descriptions = Object.keys(expectedTypeDescriptions).map(propertyName => `${propertyName}:${expectedTypeDescriptions[propertyName]}`).join(', ')
        const message = `${this.constructor.name} { ${descriptions} } called with { ${propertyName}: undefined }`
        throw new TypeError(message)
      } else if (argument === null) {
        argumentTypeDescriptions[propertyName] = null
      } else {
        argumentTypeDescriptions[propertyName] = argumentTypeName == 'object' ? 'object ' + argument.constructor.name : argumentTypeName
        if (typeof expectedType == 'function') {
          if (!(argument instanceof expectedType))
            compatibleTypes = false
        } else if (expectedType !== argumentTypeName) {
          compatibleTypes = false
        }
      }
    }

    if (!compatibleTypes) {
      const expected = Object.keys(expectedTypeDescriptions).map(propertyName => `${propertyName}:${expectedTypeDescriptions[propertyName]}`).join(', ')
      const actual = Object.keys(argumentTypeDescriptions).map(propertyName => `${propertyName}:${argumentTypeDescriptions[propertyName]}`).join(', ')
      throw new TypeError(`${this.constructor.name}(${expected}) called with wrong types (${actual})`)
    }

    for (const propertyName of Object.keys(properties)) {
      Object.defineProperty(this, propertyName, {
        value: propertyValues[propertyName],
        enumerable: true,
        writable: false
      })
    }
  }

  toJSON() {
    const serialized = {
      __type__: this.constructor.name
    }
    const properties = {}
    let ctor = this.constructor
    while (ctor !== ValueObject) {
      const ctorProps = Array.isArray(ctor.properties) ? ctor.properties : Object.keys(ctor.properties)
      ctorProps.forEach(p => properties[p] = true)
      ctor = Object.getPrototypeOf(ctor)
    }
    const propertyNames = Object.keys(properties)
    for (const propertyName of propertyNames) {
      if (this[propertyName] instanceof Date) {
        serialized[propertyName] = this[propertyName].toISOString()
      } else {
        serialized[propertyName] = this[propertyName]
      }
    }
    return serialized
  }

  static fromJSON(raw) {
    if (Array.isArray(this.allProperties)) {
      const args = this.allProperties.map(propertyName => raw[propertyName])
      return new this(...args)
    } else {
      const args = Object.assign({}, raw)
      delete args.__type__
      for (const propertyName in this.allProperties) {
        if (this.allProperties[propertyName] == Date) {
          args[propertyName] = new Date(args[propertyName])
        }
      }
      return new this(args)
    }
  }

  isEqualTo(otherValueObject) {
    return otherValueObject instanceof this.constructor &&
      JSON.stringify(this.toJSON()) == JSON.stringify(otherValueObject.toJSON())
  }

  validate() {
    const failures = new ValidationFailures()
    this.addValidationFailures(failures)
    if (failures.any())
      this.throwValidationError(failures)
  }

  addValidationFailures(/* failures */) {
    // override this in subclasses e.g:
    // failures.for('someProperty').add('Some message')
  }

  throwValidationError(failures) {
    throw new Error(`${this.constructor.name} is invalid: ${failures.describe()}`)
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
        throw new Error(`Unable to deserialize an object with type "${value.__type__}". Make sure you register that constructor when building deserialize.`)
      if (typeof constructor.fromJSON !== 'function')
        throw new Error(`Unable to deserialize an object with type "${value.__type__}". Deserializable types must have a static fromJSON method.`)

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

ValueObject.Scalar = Scalar

module.exports = ValueObject
