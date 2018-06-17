function ValueObject() {
  var failedAssignment = this.constructor.schema.assignProperties(this, arguments)
  if (failedAssignment) {
    throw new ValueObjectError(failedAssignment)
  }
}
ValueObject.parseSchema = function(definition) {
  var properties = {}
  for (var propertyName in definition) {
    var declared = definition[propertyName]
    properties[propertyName] = ValueObject.findPropertyType(declared)
  }
  return properties
}
ValueObject.findPropertyType = function(declared) {
  if (typeof declared === 'string') {
    var prop = ValueObject.propertyTypes[declared]
    if (prop) return prop
  } else if (Array.isArray(declared)) {
    if (declared.length != 1) {
      throw new ValueObjectError('Expected array property definition with single type element')
    }
    return new ArrayProp(ValueObject.findPropertyType(declared[0]))
  } else if (declared === Array) {
    return new UntypedArrayProp()
  } else if (declared === Date) {
    return new DateProp()
  } else if (typeof declared === 'object') {
    return new Schema(ValueObject.parseSchema(declared))
  } else if (typeof declared === 'function') {
    return new ConstructorProp(declared)
  }
  var inspected = typeof declared === 'string' ? '"' + declared + '"' : declared
  throw new ValueObjectError('Property defined as unsupported type (' + inspected + ')')
}
ValueObject.define = function(properties) {
  var VO = ValueObject
  return (function() {
    function ValueObject() {
      VO.apply(this, arguments)
    }
    ValueObject.prototype = {}
    for (var key in VO.prototype) {
      ValueObject.prototype[key] = VO.prototype[key]
    }
    ValueObject.prototype.constructor = ValueObject
    ValueObject.schema = new Schema(VO.parseSchema(properties))
    return ValueObject
  })()
}
ValueObject.definePropertyType = function(name, definition) {
  ValueObject.propertyTypes[name] = definition
}
ValueObject.prototype.isEqualTo = function(other) {
  return this.constructor.schema.areEqual(this, other)
}
ValueObject.prototype.with = function(newPropertyValues) {
  var Constructor = this.constructor
  return new Constructor(extend(this.toPlainObject(), newPropertyValues))
}
ValueObject.prototype.toJSON = function() {
  return this.constructor.schema.toJSON(this)
}
ValueObject.prototype.toPlainObject = function() {
  return this.constructor.schema.toPlainObject(this)
}
ValueObject.prototype.validate = function() {
  var failures = new ValidationFailures()
  this.addValidationFailures(failures)
  if (failures.any()) throw new ValidationError(this, failures)
}
ValueObject.prototype.addValidationFailures = function(/* failures */) {
  // override this in subclasses e.g:
  // failures.for('someProperty').add('Some message')
}
ValueObject.deserializeForNamespaces = function(namespaces) {
  var constructors = namespaces.reduce(function(ctors, namespace) {
    if (!namespace) throw new ValueObjectError('One of your namespaces is undefined.')

    return extend(ctors, namespace)
  }, {})

  return function(json) {
    return JSON.parse(json, revive)
  }

  function revive(key, value) {
    if (!value || !value.__type__) return value

    var constructor = constructors[value.__type__]

    if (!constructor)
      throw new ValueObjectError(
        'Unable to deserialize an object with type "' +
          value.__type__ +
          '".' +
          ' Make sure you register that constructor when building deserialize.'
      )

    if (typeof constructor.fromJSON === 'function') {
      return constructor.fromJSON(value)
    }

    return new constructor(value)
  }
}
ValueObject.disableFreeze = function() {
  freeze = disabledFreeze
}
ValueObject.enableFreeze = function() {
  freeze = enabledFreeze
}

function Schema(propertyTypes) {
  this.propertyTypes = propertyTypes
  this.propertyNames = keys(propertyTypes)
  this.Constructor = this.createConstructor()
}
Schema.prototype.createConstructor = function() {
  function Struct() {
    ValueObject.apply(this, arguments)
  }
  Struct.prototype = Object.create(ValueObject.prototype)
  Struct.schema = this
  Struct.prototype.constructor = Struct
  return Struct
}
Schema.prototype.extend = function(properties) {
  var newPropertyTypes = extend(this.propertyTypes, ValueObject.parseSchema(properties))
  return new Schema(newPropertyTypes)
}
Schema.prototype.assignProperties = function(assignee, args) {
  if (args.length != 1) {
    return {
      ctor: assignee.constructor,
      expected: this.describeSignature(),
      actual: args.length + ' arguments',
      failure: []
    }
  }
  var arg = args[0]
  if (typeof arg !== 'object') {
    return {
      ctor: assignee.constructor,
      expected: this.describeSignature(),
      actual: this.describePropertyValues(arg),
      failure: ['Expected object, was ' + this.describePropertyValues(arg)]
    }
  }
  delete arg.__type__
  if (!this.validateAssignedPropertyNames(arg)) {
    return {
      ctor: assignee.constructor,
      expected: this.describeSignature(),
      actual: this.describePropertyValues(arg),
      failure: describeDiffereceInKeys(this.propertyTypes, arg)
    }
  }
  var failures = []
  for (var propertyName in this.propertyTypes) {
    var coercionResult = this.propertyTypes[propertyName].coerce(arg[propertyName])
    if (coercionResult.failure) {
      failures.push({
        propertyName: propertyName,
        failure: coercionResult.failure
      })
    } else {
      assignee[propertyName] = coercionResult.value
    }
  }
  if (failures.length > 0) {
    return {
      ctor: assignee.constructor,
      expected: this.describeSignature(),
      actual: this.describePropertyValues(arg),
      failure: failures
    }
  }
  if (typeof assignee._init === 'function') {
    assignee._init()
  }
  freeze(assignee)
}
Schema.prototype.validateAssignedPropertyNames = function(assignedProperties) {
  return (
    this.areAllPropertyNamesAssigned(assignedProperties) &&
    this.areAllAssignedPropertyNamesValid(assignedProperties)
  )
}
Schema.prototype.areAllAssignedPropertyNamesValid = function(assignedProperties) {
  for (var j in assignedProperties) {
    if (Object.prototype.hasOwnProperty.call(assignedProperties, j) && !this.propertyTypes[j])
      return false
  }
  return true
}
Schema.prototype.areAllPropertyNamesAssigned = function(assignedProperties) {
  for (var i = 0; i < this.propertyNames.length; i++) {
    if (!(this.propertyNames[i] in assignedProperties)) return false
  }
  return true
}
Schema.prototype.describeSignature = function() {
  var signature = []
  for (var propertyName in this.propertyTypes) {
    signature.push(propertyName + ':' + this.propertyTypes[propertyName].describe())
  }
  return '{ ' + signature.join(', ') + ' }'
}
Schema.prototype.describePropertyValues = function(values) {
  switch (typeof values) {
    case 'string':
      return 'string value: "' + values + '"'
    case 'object':
      var signature = []
      for (var propertyName in this.propertyTypes) {
        if (propertyName in values) {
          signature.push(propertyName + ':' + inspectType(values[propertyName]))
        }
      }
      for (var valuePropertyName in values) {
        if (!(valuePropertyName in this.propertyTypes)) {
          signature.push(valuePropertyName + ':' + inspectType(values[valuePropertyName]))
        }
      }
      return '{ ' + signature.join(', ') + ' }'
    default:
      return typeof values
  }
}
Schema.prototype.coerce = function(value) {
  if (value === null) return { value: null }
  var Constructor = this.Constructor
  try {
    return { value: new Constructor(value) }
  } catch (e) {
    return e
  }
}
Schema.prototype.areEqual = function(a, b) {
  if (a === null || b === null) {
    return a === b
  }
  for (var propertyName in this.propertyTypes) {
    var property = this.propertyTypes[propertyName]
    if (
      typeof a === 'undefined' ||
      typeof b === 'undefined' ||
      !property.areEqual(a[propertyName], b[propertyName])
    ) {
      return false
    }
  }
  return a.constructor === b.constructor
}
Schema.prototype.toPlainObject = function(instance) {
  if (instance === null) return null
  var object = {}
  for (var propertyName in this.propertyTypes) {
    var property = this.propertyTypes[propertyName]
    object[propertyName] =
      typeof property.toPlainObject === 'function'
        ? property.toPlainObject(instance[propertyName])
        : JSON.parse(JSON.stringify(instance[propertyName]))
  }
  return object
}
Schema.prototype.toJSON = function(instance) {
  if (instance === null) return null
  var json = {}
  for (var propertyName in this.propertyTypes) {
    var property = this.propertyTypes[propertyName]
    json[propertyName] =
      typeof property.toJSON === 'function'
        ? property.toJSON(instance[propertyName])
        : instance[propertyName]
  }
  /* istanbul ignore next */
  if (instance.constructor.name) json.__type__ = instance.constructor.name
  return json
}
Schema.prototype.describe = function() {
  return this.describeSignature()
}

function ArrayProp(elementType) {
  this.elementType = elementType
}
ArrayProp.prototype.coerce = function(value) {
  if (value === null) return { value: null }
  if (!Array.isArray(value)) {
    return { failure: 'Expected array, was ' + inspectType(value) }
  }
  var elementType = this.elementType
  var failures = []
  var convertedValues = []
  for (var i = 0; i < value.length; i++) {
    var coercionResult = elementType.coerce(value[i])
    if (coercionResult.failure) {
      failures.push({
        propertyName: '[' + i + ']',
        failure: coercionResult.failure
      })
    } else {
      convertedValues.push(coercionResult.value)
    }
  }
  if (failures.length > 0) {
    return {
      failure: failures
    }
  }
  return { value: convertedValues }
}
ArrayProp.prototype.areEqual = function(a, b) {
  if (a.length != b.length) return false
  for (var i = 0; i < a.length; i++) {
    if (!this.elementType.areEqual(a[i], b[i])) return false
  }
  return true
}
ArrayProp.prototype.describe = function() {
  return '[' + this.elementType.describe() + ']'
}
ArrayProp.prototype.toJSON = function(instance) {
  if (instance === null) return null
  var elementType = this.elementType
  return instance.map(
    typeof elementType.toJSON === 'function'
      ? function(element) {
          return elementType.toJSON(element)
        }
      : function(element) {
          return element
        }
  )
}
ArrayProp.prototype.toPlainObject = function(instance) {
  if (instance === null) return null
  var elementType = this.elementType
  return instance.map(
    typeof elementType.toPlainObject === 'function'
      ? function(element) {
          return elementType.toPlainObject(element)
        }
      : function(element) {
          return element
        }
  )
}

function UntypedArrayProp() {}
UntypedArrayProp.prototype.coerce = function(value) {
  if (value === null) return { value: null }
  if (!Array.isArray(value)) {
    return { failure: 'Expected array, was ' + inspectType(value) }
  }
  return { value: value }
}
UntypedArrayProp.prototype.areEqual = function(a, b) {
  if (a === null && b === null) return true
  if (a.length != b.length) return false
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i] && !(typeof a[i].isEqualTo === 'function' && a[i].isEqualTo(b[i]))) {
      return false
    }
  }
  return true
}
UntypedArrayProp.prototype.describe = function() {
  return 'Array'
}
UntypedArrayProp.prototype.toJSON = function(instance) {
  return instance === null
    ? null
    : instance.map(function(element, index) {
        return typeof element.toJSON === 'function' ? element.toJSON(index) : element
      })
}
UntypedArrayProp.prototype.toPlainObject = function(instance) {
  return instance === null
    ? null
    : instance.map(function(element) {
        return typeof element.toPlainObject === 'function' ? element.toPlainObject() : element
      })
}

function ConstructorProp(ctor) {
  this.ctor = ctor
}
ConstructorProp.prototype.coerce = function(value) {
  if (value === null) return { value: null }
  var Constructor = this.ctor
  if (!(value instanceof Constructor)) {
    if (typeof Constructor.fromJSON === 'function') {
      var properties = Constructor.fromJSON(value)
      return { value: new Constructor(properties) }
    }
    if (value && value.constructor === Object) {
      return { value: new Constructor(value) }
    }
    return {
      failure: 'Expected ' + functionName(Constructor) + ', was ' + inspectType(value)
    }
  }
  return { value: value }
}
ConstructorProp.prototype.areEqual = function(a, b) {
  return this.ctor.schema ? this.ctor.schema.areEqual(a, b) : a == b
}
ConstructorProp.prototype.describe = function() {
  return functionName(this.ctor)
}
ConstructorProp.prototype.toJSON = function(instance) {
  if (instance === null) return null
  return typeof instance.toJSON === 'function'
    ? instance.toJSON()
    : JSON.parse(JSON.stringify(instance))
}
ConstructorProp.prototype.toPlainObject = function(instance) {
  if (instance === null) return null
  return typeof instance.toPlainObject === 'function'
    ? instance.toPlainObject()
    : JSON.parse(JSON.stringify(instance))
}

function DateProp() {}
DateProp.prototype.coerce = function(value) {
  if (value === null) return { value: null }
  var date
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value)
  } else {
    return { failure: 'Expected Date, string or number, was ' + inspectType(value) }
  }
  if (!isFinite(date)) {
    return { failure: 'Invalid Date' }
  }
  return { value: date }
}
DateProp.prototype.areEqual = function(a, b) {
  return a.getTime() == b.getTime()
}
DateProp.prototype.describe = function() {
  return 'Date'
}

function Primitive(cast, name) {
  this.cast = cast
  this.name = name
}
Primitive.prototype.coerce = function(value) {
  if (value === null) return { value: null }
  if (typeof value === this.name) return { value: value }
  return { failure: 'Expected ' + this.name + ', was ' + inspectType(value) }
}
Primitive.prototype.areEqual = function(a, b) {
  return this.cast(a) === this.cast(b)
}
Primitive.prototype.describe = function() {
  return this.name
}

function ObjectProp() {
  Primitive.call(this, Object, 'object')
}
ObjectProp.prototype = new Primitive(Object, 'object')
ObjectProp.prototype.areEqual = function(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function AnyProp() {}
AnyProp.prototype.coerce = function(value) {
  return { value: value }
}
AnyProp.prototype.areEqual = function(a, b) {
  return a == b
}
AnyProp.prototype.describe = function() {
  return 'any'
}

ValueObject.propertyTypes = {
  string: new Primitive(String, 'string'),
  number: new Primitive(Number, 'number'),
  boolean: new Primitive(Boolean, 'boolean'),
  object: new ObjectProp(),
  any: new AnyProp()
}

function ValidationFailures() {
  this.failures = []
}
ValidationFailures.prototype = {
  for: function(property) {
    return new ValidationFailuresForProperty(this, property)
  },

  add: function(failure) {
    this.failures.push(typeof failure == 'object' ? failure : new InvalidObject(failure))
    return this
  },

  any: function() {
    return this.failures.length > 0
  },

  map: function() {
    return this.failures.map.apply(this.failures, arguments)
  },

  describe: function() {
    return this.map(function(failure) {
      return failure.describe()
    }).join(', ')
  }
}

function ValidationFailuresForProperty(failures, property) {
  this.failures = failures
  this.property = property
}
ValidationFailuresForProperty.prototype.add = function(message) {
  this.failures.add(new InvalidProperty(this.property, message))
  return this
}

function InvalidObject(message) {
  this.message = message
}
InvalidObject.prototype.describe = function() {
  return this.message
}

function InvalidProperty(property, message) {
  this.property = property
  this.message = message
}
InvalidProperty.prototype.describe = function() {
  return this.property + ' ' + this.message
}

function ValidationError(object, failures) {
  /* istanbul ignore next */
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ValidationError)
  }
  this.object = object
  this.failures = failures
  this.message = functionName(object.constructor) + ' is invalid: ' + failures.describe()
}
ValidationError.prototype = new Error()

function keys(o) {
  var k = []
  for (var key in o) {
    k.push(key)
  }
  return k
}

function describeDiffereceInKeys(expected, actual) {
  var expectedKeys = keys(expected).sort()
  var actualKeys = keys(actual).sort()
  var missingKeys = expectedKeys.filter(arrayIsMissing(actualKeys))
  var extraKeys = actualKeys.filter(arrayIsMissing(expectedKeys))
  return missingKeys
    .map(function(k) {
      return k + ' is missing'
    })
    .concat(
      extraKeys.map(function(k) {
        return k + ' is unexpected'
      })
    )
}

function arrayIsMissing(array) {
  return function(item) {
    for (var i = 0; i < array.length; i++) if (array[i] == item) return false
    return true
  }
}

function extend(extendee, extender) {
  var extended = {}
  withOwnProperties(extendee, function(prop) {
    extended[prop] = extendee[prop]
  })
  withOwnProperties(extender, function(prop) {
    extended[prop] = extender[prop]
  })
  return extended
}

function withOwnProperties(subject, fn) {
  for (var prop in subject) {
    if (Object.prototype.hasOwnProperty.call(subject, prop)) {
      fn(prop)
    }
  }
}

function inspectType(o) {
  if (o === null) return 'null'
  var t = typeof o
  if (t !== 'object') return t
  return functionName(o.constructor) === 'Object' ? 'object' : functionName(o.constructor)
}

function ValueObjectError(message) {
  if (typeof message === 'object') {
    this.failure = message
    message = describeInvalidPropertyValues(message, '')
  }
  this.name = 'ValueObjectError'
  this.message = message
  this.stack = new Error(message).stack
}
ValueObjectError.prototype = new Error()
ValueObject.ValueObjectError = ValueObjectError

function describeInvalidPropertyValues(invalidPropertyValues, indent) {
  if (Array.isArray(invalidPropertyValues)) {
    return invalidPropertyValues
      .map(function(v) {
        return describeInvalidPropertyValues(v, indent)
      })
      .join('\n')
  } else if (typeof invalidPropertyValues === 'string') {
    return indent + invalidPropertyValues
  } else if (invalidPropertyValues.propertyName) {
    return (
      indent +
      invalidPropertyValues.propertyName +
      ' is invalid:\n' +
      describeInvalidPropertyValues(invalidPropertyValues.failure, indent + '  ')
    )
  }

  var typeExplanation =
    indent +
    functionName(invalidPropertyValues.ctor) +
    ' was constructed with invalid property values\n' +
    indent +
    '  Expected: ' +
    invalidPropertyValues.expected +
    '\n' +
    indent +
    '  Actual:   ' +
    invalidPropertyValues.actual

  return invalidPropertyValues.failure.length > 0
    ? typeExplanation +
        '\n' +
        invalidPropertyValues.failure
          .map(function(failure) {
            return describeInvalidPropertyValues(failure, indent + '  ')
          })
          .join('\n')
    : typeExplanation
}

function disabledFreeze() {}
var enabledFreeze = 'freeze' in Object ? Object.freeze : /* istanbul ignore next */ disabledFreeze
var freeze = enabledFreeze
var functionName = ValueObject.name
  ? function(fn) {
      return fn.name
    }
  : /* istanbul ignore next */ function() {
      return 'ValueObject'
    }

function Scalar(value) {
  ValueObject.call(this, typeof value === 'string' ? { value: value } : value)
}
Scalar.prototype = Object.create(ValueObject.prototype)
Scalar.prototype.constructor = Scalar
Scalar.prototype.constructor.schema = new Schema(ValueObject.parseSchema({ value: 'string' }))
Scalar.prototype.valueOf = function() {
  return this.value
}
Scalar.prototype.inspect = function(_, options) {
  return (
    functionName(this.constructor) +
    " { value: '" +
    (options.stylize ? options.stylize(this.value, 'string') : this.value) +
    "' }"
  )
}
Scalar.prototype.uriEncoded = function() {
  return encodeURI(this.value)
}
Scalar.prototype.uriComponentEncoded = function() {
  return encodeURIComponent(this.value)
}
Scalar.prototype.queryEncoded = function() {
  return this.uriComponentEncoded().replace(/%20/g, '+')
}
ValueObject.Scalar = Scalar

module.exports = ValueObject
