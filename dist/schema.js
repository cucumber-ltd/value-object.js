'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

module.exports = function () {
  function Schema(properties) {
    _classCallCheck(this, Schema);

    this.properties = properties;
  }

  _createClass(Schema, [{
    key: 'assignPropertyValues',
    value: function assignPropertyValues(valueObject, args) {
      var _getPropertyNamesAndV = this.getPropertyNamesAndValues(valueObject, args, this.properties),
          propertyNames = _getPropertyNamesAndV.propertyNames,
          propertyValues = _getPropertyNamesAndV.propertyValues;

      this.checkPropertyTypes(valueObject, propertyNames, propertyValues);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(this.properties)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var propertyName = _step.value;

          Object.defineProperty(valueObject, propertyName, {
            value: propertyValues[propertyName],
            enumerable: true,
            writable: false
          });
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }, {
    key: 'getPropertyNamesAndValues',
    value: function getPropertyNamesAndValues(valueObject, args) {
      var propertyValues = args[0] || {};
      var expectedPropertyNames = Object.keys(this.properties);
      var propertyNames = Object.keys(propertyValues);
      if (args.length != 1) throw new TypeError(valueObject.constructor.name + '({' + expectedPropertyNames.join(', ') + '}) called with ' + args.length + ' arguments');

      var samePropertyNames = expectedPropertyNames.length == propertyNames.length && expectedPropertyNames.every(function (propertyName) {
        return propertyName in propertyValues;
      });
      if (!samePropertyNames) throw new TypeError(valueObject.constructor.name + '({' + expectedPropertyNames.join(', ') + '}) called with {' + propertyNames.join(', ') + '}');

      return { propertyNames: propertyNames, propertyValues: propertyValues };
    }
  }, {
    key: 'checkPropertyTypes',
    value: function checkPropertyTypes(valueObject, propertyNames, propertyValues) {
      var _this = this;

      var typeCheckResults = propertyNames.map(function (propertyName) {
        return _this.checkPropertyType(propertyName, propertyValues[propertyName], _this.properties[propertyName]);
      });

      var typeErrors = typeCheckResults.filter(function (tc) {
        return !tc.valid;
      });

      if (typeErrors.length > 0) {
        var expected = typeCheckResults.map(function (tc) {
          return tc.propertyName + ':' + tc.expected;
        }).join(', ');
        var actual = typeCheckResults.map(function (tc) {
          return tc.propertyName + ':' + tc.actual;
        }).join(', ');
        var propertySummary = typeErrors.map(function (t) {
          return '"' + t.propertyName + '" is invalid';
        }).join(', ');
        throw new TypeError(valueObject.constructor.name + '({' + expected + '}) called with invalid types {' + actual + '} - ' + propertySummary);
      }
    }
  }, {
    key: 'checkPropertyType',
    value: function checkPropertyType(propertyName, value, typeDefinition) {
      var expected = void 0;
      if (typeof typeDefinition === 'function') {
        expected = 'instanceof ' + typeDefinition.name;
      } else if (Array.isArray(typeDefinition)) {
        expected = '[' + (typeof typeDefinition[0] === 'function' ? 'instanceof ' + typeDefinition[0].name : typeDefinition[0]) + ']';
      } else {
        expected = typeDefinition;
      }

      var actual = void 0;
      if (Array.isArray(value)) {
        var typesOfElements = Array.from(new Set(value.map(function (v) {
          return (typeof v === 'undefined' ? 'undefined' : _typeof(v)) === 'object' ? 'instanceof ' + v.constructor.name : typeof v === 'undefined' ? 'undefined' : _typeof(v);
        })));
        if (typesOfElements.length === 1) {
          actual = '[' + typesOfElements[0] + ']';
        } else {
          actual = 'array of multiple types';
        }
      } else if (value instanceof Date && !isFinite(value)) {
        actual = 'Date (Invalid Date)';
      } else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
        if (value === null) {
          actual = null;
        } else {
          actual = 'instanceof ' + value.constructor.name;
        }
      } else {
        actual = typeof value === 'undefined' ? 'undefined' : _typeof(value);
      }

      var valid = void 0;
      if (value === null) {
        valid = true;
      } else if (Array.isArray(value) && Array.isArray(typeDefinition)) {
        valid = value.length === 0 || typeof typeDefinition[0] === 'function' && value.every(function (v) {
          return v instanceof typeDefinition[0];
        }) || typeof typeDefinition[0] === 'string' && value.every(function (v) {
          return (typeof v === 'undefined' ? 'undefined' : _typeof(v)) === typeDefinition[0];
        });
      } else if (value instanceof Date && !isFinite(value)) {
        valid = false;
      } else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && typeof typeDefinition === 'function') {
        valid = value instanceof typeDefinition;
      } else if (typeDefinition === 'object') {
        valid = typeof expected !== 'undefined';
      } else {
        valid = expected === actual;
      }

      return {
        valid: valid,
        actual: actual,
        expected: expected,
        propertyName: propertyName
      };
    }
  }], [{
    key: 'validateArrayProperties',
    value: function validateArrayProperties(properties) {
      Object.values(properties).forEach(function (typeDefinition) {
        if (Array.isArray(typeDefinition) && typeDefinition.length != 1) {
          throw new TypeError('Expected an array to contain a single type element.');
        }
      });
    }
  }]);

  return Schema;
}();