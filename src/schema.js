module.exports = class Schema {
  constructor(properties) {
    this.properties = properties
  }

  assignPropertyValues(valueObject, args) {
    const { propertyNames, propertyValues } = this.getPropertyNamesAndValues(valueObject, args, this.properties)
    this.checkPropertyTypes(valueObject, propertyNames, propertyValues)
    for (const propertyName of Object.keys(this.properties)) {
      Object.defineProperty(valueObject, propertyName, {
        value: propertyValues[propertyName],
        enumerable: true,
        writable: false
      })
    }
  }

  getPropertyNamesAndValues(valueObject, args) {
    const propertyValues = args[0] || {}
    const expectedPropertyNames = Object.keys(this.properties)
    const propertyNames = Object.keys(propertyValues)
    if (args.length != 1) throw new TypeError(`${valueObject.constructor.name}({${expectedPropertyNames.join(', ')}}) called with ${args.length} arguments`)

    const samePropertyNames = expectedPropertyNames.length == propertyNames.length && expectedPropertyNames.every(propertyName => propertyName in propertyValues)
    if (!samePropertyNames) throw new TypeError(`${valueObject.constructor.name}({${expectedPropertyNames.join(', ')}}) called with {${propertyNames.join(', ')}}`)

    return { propertyNames, propertyValues }
  }

  checkPropertyTypes(valueObject, propertyNames, propertyValues) {
    const typeCheckResults = propertyNames.map(propertyName => {
      return this.checkPropertyType(propertyName, propertyValues[propertyName], this.properties[propertyName])
    })

    const typeErrors = typeCheckResults.filter(tc => !tc.valid)

    if (typeErrors.length > 0) {
      const expected = typeCheckResults.map(tc => `${tc.propertyName}:${tc.expected}`).join(', ')
      const actual = typeCheckResults.map(tc => `${tc.propertyName}:${tc.actual}`).join(', ')
      const propertySummary = typeErrors.map(t => `"${t.propertyName}" is invalid`).join(', ')
      throw new TypeError(`${valueObject.constructor.name}({${expected}}) called with invalid types {${actual}} - ${propertySummary}`)
    }
  }

  checkPropertyType(propertyName, value, typeDefinition) {
    let expected
    if (typeof typeDefinition === 'function') {
      expected = `instanceof ${typeDefinition.name}`
    } else if (Array.isArray(typeDefinition)) {
      expected = `[${typeof typeDefinition[0] === 'function' ? 'instanceof '+ typeDefinition[0].name : typeDefinition[0]}]`
    } else {
      expected = typeDefinition
    }

    let actual
    if (Array.isArray(value)) {
      const typesOfElements = Array.from(new Set(value.map(v => typeof v === 'object' ? 'instanceof '+ v.constructor.name : typeof v)))
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
    } else if (Array.isArray(value) && Array.isArray(typeDefinition)) {
      valid = value.length === 0 || (
        typeof typeDefinition[0] === 'function' && value.every(v => v instanceof typeDefinition[0])
      ) || (
        typeof typeDefinition[0] === 'string' && value.every(v => typeof v === typeDefinition[0])
      )
    } else if (typeof value === 'object' && typeof typeDefinition === 'function') {
      valid = value instanceof typeDefinition
    } else if (typeDefinition === 'object') {
      valid = typeof expected !== 'undefined'
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

  static validateArrayProperties(properties) {
    Object.values(properties).forEach(typeDefinition => {
      if (Array.isArray(typeDefinition) && typeDefinition.length != 1) {
        throw new TypeError('Expected an array to contain a single type element.')
      }
    })
  }
}
