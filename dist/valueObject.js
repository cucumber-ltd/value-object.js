'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Schema = require('./schema');
var Serialization = require('./serialization');

var _require = require('./validation'),
    ValidationFailures = _require.ValidationFailures,
    ValidationError = _require.ValidationError;

var ValueObject = function () {
  _createClass(ValueObject, null, [{
    key: 'define',
    value: function define(properties) {
      if (this !== ValueObject) throw new Error('ValueObject.define() cannot be called on subclasses');
      Schema.validateArrayProperties(properties);
      var Subclass = function (_ref) {
        _inherits(ValueObject, _ref);

        function ValueObject() {
          _classCallCheck(this, ValueObject);

          return _possibleConstructorReturn(this, (ValueObject.__proto__ || Object.getPrototypeOf(ValueObject)).apply(this, arguments));
        }

        return ValueObject;
      }(this);
      Subclass.properties = properties;
      return Subclass;
    }
  }, {
    key: 'allProperties',
    get: function get() {
      var ctor = this;
      var allProperties = {};
      while (ctor !== ValueObject) {
        Object.assign(allProperties, ctor.properties);
        ctor = Object.getPrototypeOf(ctor);
      }
      return allProperties;
    }
  }]);

  function ValueObject() {
    _classCallCheck(this, ValueObject);

    new Schema(this.constructor.allProperties).assignPropertyValues(this, arguments);
    this._init();
    Object.freeze(this);
  }

  /**
   * Override this method if you need to do additional processing, such as adding additional properties
   * @private
   */


  _createClass(ValueObject, [{
    key: '_init',
    value: function _init() {}
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return Serialization.toJSON(this, ValueObject);
    }
  }, {
    key: 'isEqualTo',
    value: function isEqualTo(otherValueObject) {
      return otherValueObject instanceof this.constructor && JSON.stringify(this.toJSON()) == JSON.stringify(otherValueObject.toJSON());
    }
  }, {
    key: 'validate',
    value: function validate() {
      var failures = new ValidationFailures();
      this.addValidationFailures(failures);
      if (failures.any()) throw new ValidationError(this, failures);
    }
  }, {
    key: 'addValidationFailures',
    value: function addValidationFailures() /* failures */{
      // override this in subclasses e.g:
      // failures.for('someProperty').add('Some message')
    }
  }, {
    key: 'with',
    value: function _with(newPropertyValues) {
      return this.constructor.fromJSON(Object.assign(this.toJSON(), newPropertyValues));
    }
  }], [{
    key: 'fromJSON',
    value: function fromJSON(raw) {
      return Serialization.fromJSON(raw, this.allProperties, this);
    }
  }, {
    key: 'deserializeForNamespaces',
    value: function deserializeForNamespaces(namespaces) {
      return Serialization.deserializeForNamespaces(namespaces);
    }
  }]);

  return ValueObject;
}();

var Scalar = function (_ValueObject$define) {
  _inherits(Scalar, _ValueObject$define);

  /**
   * A scalar can be constructed with a string or an object {value: somestring}. The
   * former is for convenience, the latter for deserialisation
   * @param value string or object
   */
  function Scalar(value) {
    _classCallCheck(this, Scalar);

    if (typeof value == 'string') {
      ;

      var _this2 = _possibleConstructorReturn(this, (Scalar.__proto__ || Object.getPrototypeOf(Scalar)).call(this, { value: value }));
    } else {
      ;

      var _this2 = _possibleConstructorReturn(this, (Scalar.__proto__ || Object.getPrototypeOf(Scalar)).call(this, value));
    }return _possibleConstructorReturn(_this2);
  }

  _createClass(Scalar, [{
    key: 'valueOf',
    value: function valueOf() {
      return this.value;
    }
  }, {
    key: 'inspect',
    value: function inspect(_, options) {
      if (options.stylize) return this.constructor.name + ' { value: \'' + options.stylize(this.value, 'string') + '\' }';else return this.constructor.name + ' { value: \'' + this.value + '\' }';
    }
  }, {
    key: 'uriEncoded',
    get: function get() {
      return encodeURI(this.value);
    }
  }, {
    key: 'uriComponentEncoded',
    get: function get() {
      return encodeURIComponent(this.value);
    }
  }, {
    key: 'queryEncoded',
    get: function get() {
      return this.uriComponentEncoded.replace(/%20/g, '+');
    }
  }]);

  return Scalar;
}(ValueObject.define({ value: 'string' }));

ValueObject.Scalar = Scalar;

module.exports = ValueObject;