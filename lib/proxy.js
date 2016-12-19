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
    // returns a property descriptor for a function whose modification is frozen, which will cause the logging function
    // given by 'name' to be called
    function frozenFn (name) {
        return {
            value: function () {
                var logger = context.logger;
                return (logger[name] || loggers.default[name] || loggers.silent[name]).apply(logger, arguments);
            },
            enumerable: true,
            configurable: false,
            writable: false
        };
    }
    
    // define frozen functions for all logging function to this, then freeze this before returning
    Object.defineProperties(this, {
        log: frozenFn('log'),
        debug: frozenFn('debug'),
        info: frozenFn('info'),
        warn: frozenFn('warn'),
        error: frozenFn('error'),
        fatal: frozenFn('fatal')
    });
    Object.freeze(this);
}