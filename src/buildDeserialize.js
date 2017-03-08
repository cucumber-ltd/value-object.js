'use strict'

/**
 * Builds a deserialize function that can turn a JSON representation of an object back into that object
 * @param namespaces An Array of constructor namespaces (objects where the keys are the constructor names,
 *                   and the values are the constructor functions).
 * @returns {Function} A deserialize function that turns a JSON string into an object.
 */
module.exports = function buildDeserialize(namespaces) {
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
