var loggers = require('./loggers');

// export the LoggerProxy constructor
module.exports = LoggerProxy;

/**
 * Constructs a new logger proxy object with the provided context to ensure that all logging functions can be called
 * without needing to worry about whether the context's logger actually has those functions defined.
 *
 * @param context {LoggerContext} the context to use when the proxy's logging methods are called
 * @constructor
 */
function LoggerProxy (context) {
    var defaultProxy = null;
    
    // returns a property descriptor for a function whose modification is frozen, which will cause the logging function
    // given by 'name' to be called
    function frozenFn (name) {
        return {
            value: function () {
                var logger = context.logger;
                if (logger === loggers.silent && defaultProxy) logger = defaultProxy;
                return callMethodOnFirstMatch([logger, loggers.default, loggers.silent], name, arguments);
            },
            enumerable: true,
            configurable: false,
            writable: false
        };
    }
    
    // define frozen functions for all logging function to this, then freeze this before returning
    Object.defineProperty(this, 'default', {
        enumerable: false,
        configurable: false,
        get: function getDefaultProxy () {
            return defaultProxy;
        },
        set: function setDefaultProxy (newProxy) {
            defaultProxy = newProxy;
        }
    });
    
    loggers.methods.reduce(function (proxy, method) {
        return Object.defineProperty(proxy, method, frozenFn(method));
    }, this);
    Object.freeze(this);
}

function callMethodOnFirstMatch (objects, method, args) {
    for (var i = 0, obj; i < objects.length; i++) {
        obj = objects[i];
        if (obj && obj[method] instanceof Function) return obj[method].apply(obj, args);
    }
}