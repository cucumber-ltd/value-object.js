'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ValidationFailures = function () {
  function ValidationFailures() {
    _classCallCheck(this, ValidationFailures);

    this.failures = [];
  }

  _createClass(ValidationFailures, [{
    key: 'for',
    value: function _for(property) {
      return new ValidationFailuresForProperty(this, property);
    }
  }, {
    key: 'add',
    value: function add(failure) {
      this.failures.push((typeof failure === 'undefined' ? 'undefined' : _typeof(failure)) == 'object' ? failure : new InvalidObject(failure));
      return this;
    }
  }, {
    key: 'any',
    value: function any() {
      return this.failures.length > 0;
    }
  }, {
    key: 'map',
    value: function map() {
      return this.failures.map.apply(this.failures, arguments);
    }
  }, {
    key: 'describe',
    value: function describe() {
      return this.map(function (failure) {
        return failure.describe();
      }).join(', ');
    }
  }]);

  return ValidationFailures;
}();

var ValidationFailuresForProperty = function () {
  function ValidationFailuresForProperty(failures, property) {
    _classCallCheck(this, ValidationFailuresForProperty);

    this.failures = failures;
    this.property = property;
  }

  _createClass(ValidationFailuresForProperty, [{
    key: 'add',
    value: function add(message) {
      this.failures.add(new InvalidProperty(this.property, message));
      return this;
    }
  }]);

  return ValidationFailuresForProperty;
}();

var InvalidObject = function () {
  function InvalidObject(message) {
    _classCallCheck(this, InvalidObject);

    this.message = message;
  }

  _createClass(InvalidObject, [{
    key: 'describe',
    value: function describe() {
      return this.message;
    }
  }]);

  return InvalidObject;
}();

var InvalidProperty = function () {
  function InvalidProperty(property, message) {
    _classCallCheck(this, InvalidProperty);

    this.property = property;
    this.message = message;
  }

  _createClass(InvalidProperty, [{
    key: 'describe',
    value: function describe() {
      return this.property + ' ' + this.message;
    }
  }]);

  return InvalidProperty;
}();

var ValidationError = function (_Error) {
  _inherits(ValidationError, _Error);

  function ValidationError(object, failures) {
    _classCallCheck(this, ValidationError);

    var _this = _possibleConstructorReturn(this, (ValidationError.__proto__ || Object.getPrototypeOf(ValidationError)).call(this, object.constructor.name + ' is invalid: ' + failures.describe()));

    Error.captureStackTrace(_this, ValidationError);
    _this.object = object;
    _this.failures = failures;
    return _this;
  }

  return ValidationError;
}(Error);

module.exports = {
  ValidationFailures: ValidationFailures,
  ValidationError: ValidationError
};