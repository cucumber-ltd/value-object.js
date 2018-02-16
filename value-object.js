function ValueObject() {
  ValueObject.ensureSchema(this.constructor)
  this.constructor.schema.assignProperties(this, arguments)
}
ValueObject.mergePropertyTypes = function(constructor) {
  var all = {}
  while (typeof constructor.properties === "object") {
    for (var name in constructor.properties) {
      all[name] = constructor.properties[name]
    }
    constructor = 'getPrototypeOf' in Object && Object.getPrototypeOf(constructor)
  }
  return all
}
ValueObject.ensureSchema = function(constructor) {
  if (!constructor.schema) {
    constructor.schema = new Schema(
      ValueObject.parseSchema(ValueObject.mergePropertyTypes(constructor))
    )
  }
  return constructor.schema
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
  if (typeof declared === "string") {
    return ValueObject.propertyTypes[declared]
  } else if (Array.isArray(declared)) {
    if (declared.length != 1) {
      throw new ValueObjectError('Expected array property definition with single type element')
    }
    return new ArrayProp(
      ValueObject.findPropertyType(declared[0])
    )
  } else if (typeof declared === "object") {
    return new Schema(ValueObject.parseSchema(declared))
  } else if (typeof declared === "function") {
    return new Ctor(declared)
  } else {
    throw new ValueObjectError(
      "Property defined as unsupported type (" + typeof declared + ")"
    )
  }
}
ValueObject.define = function(properties) {
  if (this !== ValueObject && this !== global) {
    throw new ValueObjectError('ValueObject.define() cannot be called on subclasses')
  }
  var DefinedValueObject = function() {
    this.constructor.schema.assignProperties(this, arguments)
  }
  ValueObject.extend(DefinedValueObject, properties)
  ValueObject.ensureSchema(DefinedValueObject)
  return DefinedValueObject
}
ValueObject.extend = function(Other, properties) {
  for (var key in ValueObject.prototype) {
    Other.prototype[key] = ValueObject.prototype[key]
  }
  Other.properties = properties
}
ValueObject.definePropertyType = function(name, definition) {
  ValueObject.propertyTypes[name] = definition
}
ValueObject.prototype.isEqualTo = function(other) {
  return this.constructor.schema.areEqual(this, other)
}
ValueObject.prototype.with = function(newPropertyValues) {
  var Constructor = this.constructor
  return new Constructor(extend(this, newPropertyValues))
}
ValueObject.prototype.toJSON = function(options) {
  return this.constructor.schema.toJSON(this, options)
}
ValueObject.prototype.validate = function() {
  var failures = new ValidationFailures()
  this.addValidationFailures(failures)
  if (failures.any())
    throw new ValidationError(this, failures)
}
ValueObject.prototype.addValidationFailures = function(/* failures */) {
  // override this in subclasses e.g:
  // failures.for('someProperty').add('Some message')
}
ValueObject.deserializeForNamespaces = function(namespaces) {
  var constructors = namespaces.reduce(function (ctors, namespace) {
    if (!namespace)
      throw new ValueObjectError('One of your namespaces is undefined.')

    return extend(ctors, namespace)
  }, {})

  return function(json) { return JSON.parse(json, revive) }

  function revive(key, value) {
    if (!value || !value.__type__) return value

    var constructor = constructors[value.__type__]

    if (!constructor)
      throw new ValueObjectError('Unable to deserialize an object with type "' + value.__type__ + '".' +
      " Make sure you register that constructor when building deserialize.")

    return new constructor(value)
  }
}

function Scalar(value) {
  ValueObject.call(this, typeof value === 'string' ? { value: value } : value)
}
ValueObject.extend(Scalar, { value: 'string' })
Scalar.prototype.valueOf = function() {
  return this.value
}
Scalar.prototype.inspect = function(_, options) {
  return functionName(this.constructor) + " { value: '" +
    (options.stylize ? options.stylize(this.value, 'string') : this.value) + "' }"
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

function Schema(propertyTypes) {
  this.propertyTypes = propertyTypes
}
Schema.prototype.createConstructor = function() {
  var schema = this
  function Struct() {
    schema.assignProperties(this, arguments)
  }
  return Struct
}
Schema.prototype.assignProperties = function(assignee, args) {
  if (args.length != 1) {
    throw new ValueObjectError(functionName(assignee.constructor) + '({' + this.describePropertyTypes() +
      '}) called with ' + args.length + ' arguments')
  }
  var arg = args[0]
  if (typeof arg !== 'object') {
    throw new ValueObjectError(functionName(assignee.constructor) + '({' + this.describePropertyTypes() +
      '}) called with ' + inspectType(arg) + ' (expected object)')
  }
  delete arg.__type__
  if (!this.validateAssignedPropertyNames(arg)) {
    throw new ValueObjectError(functionName(assignee.constructor) + '({' + this.describePropertyTypes() +
      '}) called with {' + keys(arg).join(', ') + '} ' +
      '(' + describeDiffereceInKeys(this.propertyTypes, arg) + ')')
  }
  var failures = []
  for (var propertyName in this.propertyTypes) {
    try {
      assignee[propertyName] = this.propertyTypes[propertyName].coerce(
        arg[propertyName]
      )
    } catch (e) {
      failures.push({ propertyName: propertyName, error: e })
    }
  }
  if (failures.length > 0) {
    throw new ValueObjectError(
      functionName(assignee.constructor) + '({' + this.describePropertyTypes()  +
        '}) called with invalid types {' +
        this.describePropertyValues(arg) + '} - ' +
        failures.map(function(failure) {
          return '"' + failure.propertyName + '" is invalid (' + failure.error.message + ')'
        }).join(', ')
      )
  }
  if (typeof assignee._init === 'function') {
    assignee._init()
  }
  if ('freeze' in Object) Object.freeze(assignee)
}
Schema.prototype.validateAssignedPropertyNames = function(assignedProperties) {
  var schemaKeys = keys(this.propertyTypes)
  var assignedKeys = keys(assignedProperties)
  return schemaKeys.length === assignedKeys.length &&
    schemaKeys.filter(arrayIsMissing(assignedKeys)).length === 0 &&
    assignedKeys.filter(arrayIsMissing(schemaKeys)).length === 0
}
Schema.prototype.describePropertyTypes = function() {
  var signature = []
  for (var propertyName in this.propertyTypes) {
    signature.push(propertyName + ':' + this.propertyTypes[propertyName].describe())
  }
  return signature.join(', ')
}
Schema.prototype.describePropertyValues = function(values) {
  var signature = []
  for (var propertyName in this.propertyTypes) {
    var value = values[propertyName]
    signature.push(propertyName + ':' + inspectType(value))
  }
  return signature.join(', ')
}
Schema.prototype.coerce = function(value) {
  if (value === null) return null
  var Constructor = this.createConstructor()
  return new Constructor(value)
}
Schema.prototype.areEqual = function(a, b) {
  for (var propertyName in this.propertyTypes) {
    var property = this.propertyTypes[propertyName]
    if (typeof a === 'undefined' || typeof b === 'undefined' ||
      !property.areEqual(a[propertyName], b[propertyName])) {
      return false
    }
  }
  return a.constructor.schema === b.constructor.schema
}
Schema.prototype.toJSON = function(instance, options) {
  if (instance === null) return null
  var json = {}
  for (var propertyName in this.propertyTypes) {
    var property = this.propertyTypes[propertyName]
    json[propertyName] = typeof property.toJSON === 'function' ?
      property.toJSON(instance[propertyName], options) : instance[propertyName]
  }
  if (!(options && options.typeNames === false && instance.constructor.name)) json.__type__ = instance.constructor.name
  return json
}
Schema.prototype.describe = function() {
  return '{' + this.describePropertyTypes() + '}'
}

function ArrayProp(elementType) {
  this.elementType = elementType
}
ArrayProp.prototype.coerce = function(value) {
  if (value === null) return null
  if (!Array.isArray(value)) { throw new ValueObjectError('Expected array, was ' + inspectType(value)) }
  var elementType = this.elementType
  return value.map(function(element) {
    return elementType.coerce(element)
  })
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

function Ctor(ctor) {
  this.ctor = ctor
}
Ctor.prototype.coerce = function(value) {
  if (value === null) return null
  if (!(value instanceof this.ctor)) {
    if (this.ctor === Date && typeof value === 'string') {
      return new Date(value)
    }
    var Constructor = this.ctor
    if (typeof this.ctor.fromJSON === 'function') {
      var properties = this.ctor.fromJSON(value)
      return new Constructor(properties)
    }
    if (value && value.constructor === Object) {
      return new Constructor(value)
    }
    throw new ValueObjectError('Expected ' + functionName(this.ctor) + ', was ' + inspectType(value))
  }
  if (this.ctor === Date && !isFinite(value)) {
    throw new ValueObjectError('Invalid Date')
  }
  return value
}
Ctor.prototype.areEqual = function(a, b) {
  return this.ctor.schema.areEqual(a, b)
}
Ctor.prototype.describe = function() {
  return functionName(this.ctor)
}
Ctor.prototype.toJSON = function(instance, options) {
  if (instance === null) return null
  return typeof instance.toJSON === 'function' ?
    instance.toJSON(options) : JSON.parse(JSON.stringify(instance))
}

function Primitive(cast, name) {
  this.cast = cast
  this.name = name
}
Primitive.prototype.coerce = function(value) {
  if (value === null) return null
  if (typeof value !== this.name) throw new ValueObjectError('Expected ' + this.name + ', was ' + inspectType(value))
  return this.cast(value)
}
Primitive.prototype.areEqual = function(a, b) {
  return this.cast(a) === this.cast(b)
}
Primitive.prototype.describe = function() {
  return this.name
}

function ObjectProp() { Primitive.call(this, Object, 'object') }
ObjectProp.prototype = new Primitive(Object, 'object')
ObjectProp.prototype.areEqual = function(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

ValueObject.propertyTypes = {
  string: new Primitive(String, 'string'),
  number: new Primitive(Number, 'number'),
  boolean: new Primitive(Boolean, 'boolean'),
  object: new ObjectProp()
}

function ValidationFailures() {
  this.failures = []
}
ValidationFailures.prototype = {
  for: function(property) {
    return new ValidationFailuresForProperty(this, property)
  },

  add: function (failure) {
    this.failures.push(typeof failure == 'object' ? failure : new InvalidObject(failure))
    return this
  },

  any: function () {
    return this.failures.length > 0
  },

  map: function () {
    return this.failures.map.apply(this.failures, arguments)
  },

  describe: function() {
    return this.map(function(failure) { return failure.describe() }).join(', ')
  }
}

function ValidationFailuresForProperty(failures, property) {
  this.failures = failures
  this.property = property
}
ValidationFailuresForProperty.prototype.add = function (message) {
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
InvalidProperty.prototype.describe = function () {
  return this.property + ' ' + this.message
}

function ValidationError(object, failures) {
  Error.captureStackTrace(this, ValidationError)
  this.object = object
  this.failures = failures
  this.message = functionName(object.constructor) + ' is invalid: ' + failures.describe()
}
ValidationError.prototype = new Error()

var keys = 'keys' in Object ? Object.keys : function(o) {
  var k = [];
  for (var key in o) {
    k.push(key)
  }
  return k;
}

function describeDiffereceInKeys(expected, actual) {
  var expectedKeys = keys(expected).sort()
  var actualKeys = keys(actual).sort()
  var missingKeys = expectedKeys.filter(arrayIsMissing(actualKeys))
  var extraKeys = actualKeys.filter(arrayIsMissing(expectedKeys))
  return missingKeys.map(function (k) { return '"' + k + '" is missing' }).concat(
    extraKeys.map(function (k) { return '"' + k + '" is unexpected' })
  ).join(', ')
}

function arrayIsMissing(array) {
  return function(item) {
    for (var i = 0; i < array.length; i++) if (array[i] == item) return false;
    return true
  }
}

function extend() {
  var extended = {};
  for (var key in arguments) {
    var argument = arguments[key];
    for (var prop in argument) {
      if (Object.prototype.hasOwnProperty.call(argument, prop)) {
        extended[prop] = argument[prop];
      }
    }
  }
  return extended
}

function inspectType(o) {
  if (o === null) return 'null'
  var t = typeof o;
  if (t !== 'object') return t;
  return functionName(o.constructor) === 'Object' ? 'object' : functionName(o.constructor)
}

function functionName(fn) {
  return fn.name || 'ValueObject'
}

function ValueObjectError(message) {
  this.name = 'ValueObjectError';
  this.message = message;
  this.stack = (new Error()).stack;
}
ValueObjectError.prototype = new Error;
ValueObject.ValueObjectError = ValueObjectError

module.exports = ValueObject
