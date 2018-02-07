'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

module.exports = function () {
  function Serialization() {
    _classCallCheck(this, Serialization);
  }

  _createClass(Serialization, null, [{
    key: 'toJSON',
    value: function toJSON(valueObject, ValueObject) {
      var serialized = {
        __type__: valueObject.constructor.name
      };
      var properties = {};
      var ctor = valueObject.constructor;
      while (ctor !== ValueObject) {
        Object.keys(ctor.properties).forEach(function (p) {
          return properties[p] = true;
        });
        ctor = Object.getPrototypeOf(ctor);
      }
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(properties)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var propertyName = _step.value;

          serialized[propertyName] = this.serializeValue(valueObject[propertyName]);
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

      return serialized;
    }
  }, {
    key: 'fromJSON',
    value: function fromJSON(raw, properties, ValueObject) {
      var args = Object.assign({}, raw);
      delete args.__type__;
      for (var propertyName in properties) {
        if (properties[propertyName] == Date && args[propertyName] !== null) {
          args[propertyName] = new Date(args[propertyName]);
        }
      }
      return new ValueObject(args);
    }
  }, {
    key: 'serializeValue',
    value: function serializeValue(value) {
      return value instanceof Date ? value.toISOString() : value;
    }
  }, {
    key: 'deserializeForNamespaces',
    value: function deserializeForNamespaces(namespaces) {
      var constructors = namespaces.reduce(function (ctors, namespace) {
        if (!namespace) throw new Error('One of your namespaces is undefined.');

        return Object.assign(ctors, namespace);
      }, {});

      return function (json) {
        return JSON.parse(json, revive);
      };

      function revive(key, value) {
        if (!value || !value.__type__) return value;

        var constructor = constructors[value.__type__];

        if (!constructor) throw new Error('Unable to deserialize an object with type "' + value.__type__ + '".' + " Make sure you register that constructor when building deserialize.");
        if (typeof constructor.fromJSON !== 'function') throw new Error('Unable to deserialize an object with type "' + value.__type__ + '".' + " Deserializable types must have a static fromJSON method.");

        return constructor.fromJSON(value);
      }
    }
  }]);

  return Serialization;
}();