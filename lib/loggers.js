var methods = ['log', 'silly', 'debug', 'verbose', 'info', 'warn', 'error', 'fatal'];

// a function that does nothing, used throughout this module as a convenience
var noop = function () {};

// for defining noop properties, ensures that those properties cannot be altered
var frozenNoop = {value: noop, enumerable: true, configurable: false, writable: false};

// a logger where every method is defined, but just does nothing. This is the "silent" logger
var silentLogger = methods.reduce(function (logger, method) {
    return Object.defineProperty(logger, method, frozenNoop);
}, {});

// initially the default logger is set to the silentLogger
var defaultLogger = Object.freeze(silentLogger);

// all properties defined on exports are wrapped by getters/setters to ensure integrity of the values used internally
Object.defineProperties(module.exports, {
    // default logger can be redefined, but attempting to set null values will result in the silentLogger being used
    default: {
        configurable: false,
        enumerable: true,
        get: function getDefaultLogger () {
            return defaultLogger;
        },
        set: function setDefaultLogger (logger) {
            defaultLogger = logger || silentLogger;
        }
    },
    // silent logger is exposed, but is not writable (and is already frozen, so essentially immutable)
    silent: {
        configurable: false,
        enumerable: true,
        writable: false,
        value: silentLogger
    },
    methods: {
        configurable: false,
        writable: false,
        enumerable: false,
        value: methods
    }
});