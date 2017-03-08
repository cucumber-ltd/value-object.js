# value-object.js

`Value Object`: Objects that matter only as the combination of their attributes.
Two value objects with the same values for all their attributes are considered
equal.

## Install

    npm install value-object

## Usage

```js
const { ValueObject } = require('value-object')

class Currency extends ValueObject.define({
  code: 'string',
  name: 'string'
}) {}

class Money extends ValueObject.define({
  currency: Currency,
  amount: 'number'
}) {}

const gbp = new Currency({ code: 'GBP', name: 'British Pounds' })
const eur = new Currency({ code: 'EUR', name: 'Euros' })
const gbpPrice = new Money({ currency: gbp, amount: 12.34 })
const salePrice = gbpPrice.with({ amount: 12.00 })

gbp.isEqualTo(eur) // => false
gbp.isEqualTo(new Currency({ code: 'GBP', name: 'British Pounds' })) // => true
gbpPrice.isEqualTo(new Money({ currency: gbp, amount: 12.34 })) // => true
gbpPrice.isEqualTo(new Money({ currency: eur, amount: 12.00 })) // => false
```
