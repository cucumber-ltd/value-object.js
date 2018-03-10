function ValueObject() {
  ValueObject.ensureSchema(this.constructor)
  this.constructor.schema.assignProperties(this, arguments)
}
ValueObject.mergeProperties = function(constructor) {
  var all = {}
  while (constructor) {
    for (var name in constructor.properties) {
      all[name] = constructor.properties[name]
    }
    constructor = Object.getPrototypeOf(constructor)
  }
  return all
}
ValueObject.ensureSchema = function(constructor) {
  if (!constructor.schema) {
    constructor.schema = new Schema(
      ValueObject.parseSchema(ValueObject.mergeProperties(constructor))
    )
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
  if (typeof declared === "string") {
    return ValueObject.propertyTypes[declared]
  } else if (Array.isArray(declared)) {
    if (declared.length != 1) {
      throw new ValueObjectError('Expected array property definition with single type element')
    }
    return new ArrayProp(
      ValueObject.findPropertyType(declared[0])
    )
  } else if (declared === Array) {
    return new UntypedArrayProp()
  } else if (typeof declared === "object") {
    return new Schema(ValueObject.parseSchema(declared))
  } else if (typeof declared === "function") {
    return new ConstructorProp(declared)
  } else {
    throw new ValueObjectError(
      "Property defined as unsupported type (" + typeof declared + ")"
    )
  }
}
ValueObject.define = function(properties) {
  ValueObject.parseSchema(properties)
  function Definition() {
    ValueObject.apply(this, arguments)
  }
  ValueObject.extend(Definition, properties)
  Definition.define = function(moreProperties) {
    return ValueObject.define(extend(properties, moreProperties))
  }
  ValueObject.ensureSchema(Definition)
  return Definition
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
  if (!Constructor.With) {
    Constructor.With = function With() {}
    Constructor.With.prototype = Object.create(Constructor.prototype)
    Constructor.With.prototype.constructor = Constructor
  }

  var instance = new Constructor.With()
  for (var propertyName in Constructor.schema.propertyTypes) {
    instance[propertyName] = this[propertyName]
  }
  for (var newPropertyName in newPropertyValues) {
    var property = Constructor.schema.propertyTypes[newPropertyName]
    if (!property) {
      Constructor.schema.assignProperties(instance, [extend(this, newPropertyValues)])
    }
    instance[newPropertyName] = property.coerce(
      newPropertyValues[newPropertyName]
    )
  }
  freeze(instance)
  return instance
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

    if (typeof constructor.fromJSON === 'function') {
      return constructor.fromJSON(value)
    }

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
  this.propertyNames = keys(propertyTypes)
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
  freeze(assignee)
}
Schema.prototype.validateAssignedPropertyNames = function(assignedProperties) {
  return this.areAllPropertyNamesAssigned(assignedProperties) &&
    this.areAllAssignedPropertyNamesValid(assignedProperties)
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
Schema.prototype.toPlainObject = function(instance) {
  if (instance === null) return null
  var object = {}
  for (var propertyName in this.propertyTypes) {
    var property = this.propertyTypes[propertyName]
    object[propertyName] = typeof property.toPlainObject === 'function' ?
      property.toPlainObject(instance[propertyName]) : JSON.parse(JSON.stringify(instance[propertyName]))
  }
  return object
}
Schema.prototype.toJSON = function(instance) {
  if (instance === null) return null
  var json = {}
  for (var propertyName in this.propertyTypes) {
    var property = this.propertyTypes[propertyName]
    json[propertyName] = typeof property.toJSON === 'function' ?
      property.toJSON(instance[propertyName]) : instance[propertyName]
  }
  if (instance.constructor.name) json.__type__ = instance.constructor.name
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
ArrayProp.prototype.toJSON = function(instance) {
  return instance === null ? null : instance.map(function(element, index) {
    return typeof element.toJSON === 'function' ? element.toJSON(index) : element
  })
}
ArrayProp.prototype.toPlainObject = function(instance) {
  return instance === null ? null : instance.map(function(element) {
    return element === null ? null : typeof element.toPlainObject === 'function' ? element.toPlainObject() : element
  })
}

function UntypedArrayProp() {}
UntypedArrayProp.prototype.coerce = function(value) {
  if (value === null) return null
  if (!Array.isArray(value)) { throw new ValueObjectError('Expected array, was ' + inspectType(value)) }
  return value
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
  return instance === null ? null : instance.map(function(element, index) {
    return typeof element.toJSON === 'function' ? element.toJSON(index) : element
  })
}
UntypedArrayProp.prototype.toPlainObject = function(instance) {
  return instance === null ? null : instance.map(function(element) {
    return typeof element.toPlainObject === 'function' ? element.toPlainObject() : element
  })
}

function ConstructorProp(ctor) {
  this.ctor = ctor
}
ConstructorProp.prototype.coerce = function(value) {
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
ConstructorProp.prototype.areEqual = function(a, b) {
  return this.ctor.schema.areEqual(a, b)
}
ConstructorProp.prototype.describe = function() {
  return functionName(this.ctor)
}
ConstructorProp.prototype.toJSON = function(instance) {
  if (instance === null) return null
  return typeof instance.toJSON === 'function' ?
    instance.toJSON() : JSON.parse(JSON.stringify(instance))
}

function Primitive(cast, name) {
  this.cast = cast
  this.name = name
}
Primitive.prototype.coerce = function(value) {
  if (typeof value === this.name) return value
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

function extend(extendee, extender) {
  var extended = {}, prop
  for (prop in extendee) {
    if (Object.prototype.hasOwnProperty.call(extendee, prop)) {
      extended[prop] = extendee[prop];
    }
  }
  for (prop in extender) {
    if (Object.prototype.hasOwnProperty.call(extender, prop)) {
      extended[prop] = extender[prop];
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

function ValueObjectError(message) {
  this.name = 'ValueObjectError';
  this.message = message;
  this.stack = (new Error(message)).stack;
}
ValueObjectError.prototype = new Error;
ValueObject.ValueObjectError = ValueObjectError

var freeze = 'freeze' in Object ? Object.freeze : function() {}
var functionName = ValueObject.name ? function(fn) { return fn.name } : function() { return 'ValueObject' }

module.exports = ValueObject
