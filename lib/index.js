var cache = require('./cache'),
    loggers = require('./loggers');

// export the injector function
module.exports = Object.defineProperties(injector, {
    // default logger can be redefined, but attempting to set null values will result in the silentLogger being used
    loggers: {
        configurable: false,
        writable: false,
        enumerable: true,
        value: loggers
    },
    // cache config is exposed as cache so that MAX_DEPTH can be redefined and keys can be used externally
    cache: {
        configurable: false,
        writable: false,
        enumerable: true,
        value: cache.config
    }
});

/**
 * Adds a new context to the cache and overrides exports with a setter that will ensure the logger property is always
 * present on the exports of the module provided.
 *
 * @param mod {Module} a node module object to extend with a logger property
 * @param property {String} name of the property that will be added to the exports of mod
 * @param definition {Object} property description object, defaults to a non-enumerable, configurable object
 * @returns {Object} a logger proxy object with log, debug, info, warn, error, and fatal methods defined
 */
function injector (mod, property, definition) {
    // check if the provided value was really a module, this is required for everything else to work properly
    if (!(mod instanceof module.constructor)) throw new Error('mod parameter must be a module object');

    // create a new context for this module and alias its exports
    var context = cache.insert(mod),
        exports = mod.exports,
        def = definition || {};
    
    // redefine exports as a property on module that will be extended with the logger property any time is is assigned
    Object.defineProperty(mod, 'exports', {
        get: function getExports () { return exports; },
        
        // setter reassigns aliased exports to the provided value and redefines the logger property
        set: function setExports (val) {
            var isPrimitive = !(val instanceof Object);
            exports = isPrimitive ? val : Object.defineProperty(val, '' + (property || 'logger'), {
    
                // configurability of the logger property defaults to true
                configurable: def.configurable === undefined || !!def.configurable,
    
                // enumerability defaults to false to avoid breaking anything for those that enumerate module properties
                enumerable: !!def.enumerable,
                
                get: function getLogger () {
                    var logger = context.logger;
                    return def.get instanceof Function ? def.get(logger) : logger;
                },
                set: function setLogger (logger) {
                    context.logger = def.set instanceof Function ? def.set(logger) : logger;
                }
            });
        }
    });
    
    // reassigning exports here calls the setter just defined to ensure the logger property is added before returning
    mod.exports = exports;
    
    return context.proxy;
}