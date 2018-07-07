# value-object.js

`Value Object` - objects that matter only as the combination of their
properties. Two value objects with the same values for all their properties are
considered equal.

This library provides a convenient way to define strict, immutable value
objects.

## Install

    npm install value-object

## Defining value objects

Use subclasses to define value objects with type constraints:

```js
const ValueObject = require('value-object')

class Currency extends ValueObject.define({
  code: 'string',
  name: 'string'
}) {}

class Money extends ValueObject.define({
  currency: Currency,
  amount: 'number'
}) {}
```

...or don't use classes, if you prefer:

```js
const Money = ValueObject.define({
  amount: 'number',
  currency: { code: 'string' }
})
```

## Instantiating value objects

Use the `new` keyword, passing values for each property:

```js
const gbp = new Currency({ code: 'GBP', name: 'British Pounds' })
const price = new Money({ currency: gbp, amount: 12.34 })
const other = new Money({ currency: { code: 'USD', name: 'US Dollars' }, amount: 14.56 })
```

Constraints prevent value objects from being instantiated with invalid property
values.

### Unexpected types

Property values with unexpected types are rejected:

```js
> new Currency({ code: 'USD', name: 123 })
```

```
Error: Currency was constructed with invalid property values
  Expected: { code:string, name:string }
  Actual:   { code:string, name:number }
    name is invalid:
      Expected string, was number
```

### Unrecognised properties

Value objects cannot be instantiated with unrecognised properties:

```js
> new Currency({ code: 'NZD', name: 'New Zealand Dollars', colour: 'All black' })
```

```
Error: Currency was constructed with invalid property values
  Expected: { code:string, name:string }
  Actual:   { code:string, name:string, colour:string }
    colour is invalid:
      Property is unexpected
```

### Missing properties

Value objects cannot be instantiated with missing properties (unless they are [optional](#optional-properties)):

```js
> new Money({ amount: 123 })
```

```
Error: Money was constructed with invalid property values
  Expected: { currency:Currency, amount:number }
  Actual:   { amount:number }
    currency is invalid:
      Property is missing
```

### Setting properties to `null`

Properties can be set to `null`:

```js
> new Money({ currency: null, amount: null })
```

```
Money { currency: null, amount: null }
```

### Setting properties to `undefined`

Properties **cannot** be set to `undefined` (unless they are [optional](#optional-properties)):

```js
> new Money({ currency: null, amount: undefined })
```

```
Error: Money was constructed with invalid property values
  Expected: { currency:Currency, amount:number }
  Actual:   { currency:null, amount:undefined }
    amount is invalid:
      Expected number, was undefined
```

## Built-in property types

Properties can be declared with built-in type constraints:

```js
class Manager extends ValueObject.define({
  firstName: 'string',
  age: 'number',
  trained: 'boolean',
  subordinates: 'object',
  preferences: 'any'
}) {}
```

* `string`: expects a value where `typeof value === 'string'`
* `number`: expects a value where `typeof value === 'number'`
* `boolean`: expects a value where `typeof value === 'boolean'`
* `object`: expects a value where `typeof value === 'object'`
* `any`: expects any non-null value

## Optional properties

Properties declared with `?` can be set to `null` or `undedined`, or omitted
altogether:

```js
class Options extends ValueObject.define({
  age: 'number?',
  aliases: 'object?',
  colour: 'string?',
  checked: 'boolean?'
}) {}

new Options({ age: null, aliases: {}, colour: undefined })
// => Options { age: null, aliases: {}, colour: undefined }
```

Optional properties can also be declared with `ValueObject.optional()`:

```js
class IceCream extends ValueObject.define({
  flavours: ValueObject.optional(['string'])
}) {}

new IceCream({ flavours: ['mint', 'chocolate'] })
// => IceCream { flavours: [ 'mint', 'chocolate' ] }

new IceCream({})
// => IceCream {}
```

## Array properties

Arrays with arbitrary elements can be declared with the type `Array`:

```js
class Person extends ValueObject.define({
  favouriteThings: Array
}) {}
```

## Generic array properties

Arrays with value constraints are declared by wrapping the type definition (e.g.
`'number'`, `Date`) in `[]`:

```js
class Point extends ValueObject.define({
  x: 'number',
  y: 'number'
}) {}

class Polygon extends ValueObject.define({
  vertices: [Point] // instances of Point
}) {}
```

## User-defined properties

Custom property types can be defined with `ValueObject.definePropertyType()` and
then used later by name in `ValueObject.define()`:

```js
ValueObject.definePropertyType('money', () => ({
  coerce(value) {
    if (typeof value === 'string') {
      const parts = value.split(' ')
      return { value: { amount: Number(parts[0]), currency: parts[1] } }
    }
    return { failure: 'Only string values allowed' }
  },

  areEqual(a, b) {
    return a.currency == b.currency && a.amount == b.amount
  },

  describe() {
    return '<money>'
  }
}))
class Allowance extends ValueObject.define({ cash: 'money' }) {}
```

Property constraints are expressed as a function that returns a value with
the following methods:

* `.coerce(value)` converts an arbitrary value to the final property value.
  Expected to return `{ value }` when converting the property value is successful or `{ failure }` with a message when converting fails.
* `.areEqual(a, b)` returns `true` if two instances of the type are considered equal, or `false` otherwise.
* `.describe()` returns a string used in error messages mentioning the property.

The custom property type can then constrain properties values according to its
`.coerce(value)` method:

```js
> new Allowance({ cash: '123.00 GBP' })
```

```
Allowance { cash: { amount: 123, currency: 'GBP' } }
```

```js
> new Allowance({ cash: 666 })
```

```
Error: Allowance was constructed with invalid property values
   Expected: { cash:<money> }
   Actual:   { cash:number }
   cash is invalid:
     Only string values allowed
```

## Equality

Value objects are considered to be equal if their properties are equal. Equality
of two objects is tested by calling `valueObject.isEqualTo(otherValueObject)`:

```js
gbp.isEqualTo(new Currency({ code: 'GBP', name: 'British Pounds' }))
// => true

gbp.isEqualTo(new Currency({ code: 'EUR', name: 'Euros' }))
// => false

const gbpPrice = new Money({ amount: 123, currency: gbp })
const eurPrice = new Money({ amount: 123, currency: eur })
gbpPrice.isEqualTo(eurPrice)
// => false

eurPrice.isEqualTo(new Money({ amount: 123, currency: eur }))
// => true
```

## Reflection

ValueObject types have a `schema` property that allows reflection over
properties and arbitrary metadata associated with each property:

```js
class Product extends ValueObject.define({
  name: 'string',
  stockLevel: {
    type: 'number',
    default: 0,
    description: 'units in stock'
  }
}) {}

> Product.schema.properties.stockLevel
```

```
Property {
  constraint: Primitive { cast: [Function: Number], name: 'number' },
  metadata: { default: 0, description: 'units in stock' },
  optional: false }
```

## Creating new value objects from existing value objects

Use `with(newAttributes)` to create new value objects, with new values for a
specific set of properties:

```js
const salePrice = price.with({ amount: 12.0 })
salePrice.currency.code
// => 'GBP'
```

## Converting value objects to plain objects

Use `toPlainObject()` to create a plain old mutable object from a value object's
property values:

```js
> JSON.stringify(gbp.toPlainObject())
```

```json
{ "code": "GBP", "name": "British Pounds" }
```

## Converting value objects to JSON

Use `toJSON()` to create an object with `__type__` properties for subsequent
deserialization:

```js
> JSON.stringify(gbp.toJSON())
```

```json
{ "__type__": "Currency", "code": "GBP", "name": "British Pounds" }
```

## Converting value objects from JSON

Use `ValueObject.deserializeForNamespaces()` to create a deserialize function
that can turn the resulting JSON string back into objects

```js
const deserialize = ValueObject.deserializeForNamespaces([{ Currency }])
const gbp2 = deserialize('{"__type__":"Currency","code":"GBP","name":"British Pounds"}')
gbp2.isEqualTo(gbp)
// => true
```

## Immutability

Value objects cannot be updated. Use [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)
to throw errors when attempts to set property values are made.

```js
gbp.code = 'USD'
// TypeError:Cannot assign to read only property 'amount' of object '#<Currency>
```
