var Benchmark = require('benchmark');
var suite = new Benchmark.Suite;
var ValueObject = require('../value-object')

class Bar extends ValueObject.define({
  a: 'number',
  b: 'number'
}) {}

class Foo extends ValueObject.define({
  x: 'string',
  y: 'string',
  z: Bar
}) {}

new Foo({
  x: 'hello',
  y: 'howdy',
  z: {
    a: 66,
    b: 77
  }
})

suite.add('making some value objects', function() {
  new Foo({
    x: 'hello',
    y: 'howdy',
    z: {
      a: 66,
      b: 77
    }
  }).with({
    y: 'right'
  }).with({
    x: 'yo'
  })
})
// add listeners
.on('cycle', function(event) {
  console.log(String(event.target)); // eslint-disable-line
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').map('name')); // eslint-disable-line
})
// run async
.run({ 'async': true });
