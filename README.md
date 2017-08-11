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

## Instantiating value objects

Use the `new` keyword:

```js
const gbp = new Currency({ code: 'GBP', name: 'British Pounds' })
const price = new Money({ currency: gbp, amount: 12.34 })
```

The type constraints prevent value objects from being instantiated with
incorrect arguments:

```js
new Currency({ code: 'USD', name: 123 })
// => TypeError: Currency({code:string, name:string}) called with wrong types {code:string, name:number}

new Currency({ code: 'NZD', name: 'New Zealand Dollars', colour: 'All black' })
// => TypeError: Currency({code, name}) called with {code, name, colour}

new Money({ amount: 123 })
// => TypeError: Money({currency, amount}) called with {amount}
```

## Equality

Value objects are considered to be equal if their properties are equal:

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

## Array values

To specify array values wrap the type definition (e.g. `'number'`, `Date`) in `[]`

```js
class Point extends ValueObject.define({
  x: 'number',
  y: 'number'
}) {}

class Polygon extends ValueObject.define({
  vertices: [Point] // instances of Point
}) {}
```

## Creating new value objects from existing value objects

Use `with(newAttributes)` to create new value objects

```js
var salePrice = price.with({ amount: 12.00 })
salePrice.currency.code
// => 'GBP'
```

## Converting value objects to JSON

Use `toJSON()` to create an object that can be passed to `JSON.stringify()`

```js
JSON.stringify(gbp.toJSON())
// => '{"__type__":"Currency","code":"GBP","name":"British Pounds"}'
```

## Converting value objects from JSON

Use `ValueObject.deserializeForNamespaces()` to create a deserialize function
that can turn the resulting JSON back into objects

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
