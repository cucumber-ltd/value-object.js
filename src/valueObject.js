'use strict'

const { ValidationFailures, ValidationError } = require('./validation')

class ValueObject {
  static define(properties) {
    if (this !== ValueObject) throw new Error('ValueObject.define() cannot be called on subclasses')
    validateArrayProperties(properties)
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
    assignNamedProperties(this, arguments)
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

function validateArrayProperties(properties) {
  Object.values(properties).forEach(typeDefinition => {
    if (Array.isArray(typeDefinition) && typeDefinition.length != 1) {
      throw new TypeError('Expected an array to contain a single type element.')
    }
  })
}

function assignNamedProperties(valueObject, args) {
  const properties = valueObject.constructor.allProperties
  const { propertyNames, propertyValues } = getPropertyNamesAndValues(valueObject, args, properties)
  checkPropertyTypes(valueObject, properties, propertyNames, propertyValues)
  for (const propertyName of Object.keys(properties)) {
    Object.defineProperty(valueObject, propertyName, {
      value: propertyValues[propertyName],
      enumerable: true,
      writable: false
    })
  }
}

function getPropertyNamesAndValues(valueObject, args, properties) {
  const propertyValues = args[0] || {}
  const expectedPropertyNames = Object.keys(properties)
  const propertyNames = Object.keys(propertyValues)
  if (args.length != 1) throw new TypeError(`${valueObject.constructor.name}({${expectedPropertyNames.join(', ')}}) called with ${args.length} arguments`)

  const samePropertyNames = expectedPropertyNames.length == propertyNames.length && expectedPropertyNames.every(propertyName => propertyName in propertyValues)
  if (!samePropertyNames) throw new TypeError(`${valueObject.constructor.name}({${expectedPropertyNames.join(', ')}}) called with {${propertyNames.join(', ')}}`)

  return { propertyNames, propertyValues }
}

function checkPropertyTypes(valueObject, properties, propertyNames, propertyValues) {
  const typeCheckResults = propertyNames.map(propertyName => {
    return checkPropertyType(propertyName, propertyValues[propertyName], properties[propertyName])
  })

  const typeErrors = typeCheckResults.filter(tc => !tc.valid)

  if (typeErrors.length > 0) {
    const expected = typeCheckResults.map(tc => `${tc.propertyName}:${tc.expected}`).join(', ')
    const actual = typeCheckResults.map(tc => `${tc.propertyName}:${tc.actual}`).join(', ')
    throw new TypeError(`${valueObject.constructor.name}({${expected}}) called with wrong types {${actual}}`)
  }
}
function checkPropertyType(propertyName, value, typeDefinition) {
  let expected
  if (typeof typeDefinition === 'function') {
    expected = `instanceof ${typeDefinition.name}`
  } else if (Array.isArray(typeDefinition)) {
    expected = `[${typeof typeDefinition[0] === 'function' ? 'instanceof '+typeDefinition[0].name : typeDefinition[0]}]`
  } else {
    expected = typeDefinition
  }

  let actual
  if (Array.isArray(value)) {
    const typesOfElements = Array.from(new Set(value.map(v => typeof v === 'object' ? 'instanceof '+v.constructor.name : typeof v)))
    if (typesOfElements.length === 1) {
      actual = `[${typesOfElements[0]}]`
    } else {
      actual = `array of multiple types`
    }
  } else if (typeof value === 'object') {
    if (value === null) {
      actual = null
    } else {
      actual = `instanceof ${value.constructor.name}`
    }
  } else {
    actual = typeof value
  }

  let valid
  if (value === null) {
    valid = true
  } else if (Array.isArray(value) && Array.isArray(typeDefinition) && typeof typeDefinition[0] === 'function') {
    valid = value.every(v => v instanceof typeDefinition[0])
  } else if (typeof value === 'object' && typeof typeDefinition === 'function') {
    valid = value instanceof typeDefinition
  } else {
    valid = expected === actual
  }

  return {
    valid,
    actual,
    expected,
    propertyName
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
