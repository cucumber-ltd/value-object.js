module.exports = class Serialization {
  static toJSON(valueObject, ValueObject) {
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
      serialized[propertyName] = this.serializeValue(valueObject[propertyName])
    }
    return serialized
  }

  static fromJSON(raw, properties, ValueObject) {
    const args = Object.assign({}, raw)
    delete args.__type__
    for (const propertyName in properties) {
      if (properties[propertyName] == Date) {
        args[propertyName] = new Date(args[propertyName])
      }
    }
    return new ValueObject(args)
  }

  static serializeValue(value) {
    return value instanceof Date ? value.toISOString() : value
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
