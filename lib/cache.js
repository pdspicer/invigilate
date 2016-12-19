var LoggerContext = require('./context');

module.exports = {lookup: lookup, insert: insert, config: {}};

// cache will store information about where invigilate has been called from and keep the cascading reference information
var cache = {},

// max depth is used to limit the number of levels over which cascading occurs
    MAX_DEPTH = 20;

Object.defineProperties(module.exports.config, {
    // max depth can be redefined, but values will be ignored if not numbers or if less than 0
    MAX_DEPTH: {
        configurable: false,
        enumerable: true,
        get: function getMaxDepth () {
            return MAX_DEPTH;
        },
        set: function setMaxDepth (newDepth) {
            MAX_DEPTH = Math.max(+newDepth || MAX_DEPTH, 0);
        }
    },
    // cache is read-only, and only returns keys (to avoid modification of any of the underlying values)
    keys: {
        configurable: false,
        enumerable: true,
        get: function getCacheKeys () {
            return Object.keys(cache);
        },
        set: function () {}
    }
});
/**
 * Loops up the module's parent chain starting with the current module to find the closest parent for which a cached
 * context exists. Will return null if none is found or looping exceeds MAX_DEPTH.
 *
 * @param mod {Module} the module to start at
 * @returns {LoggerContext | null} the found context, or null if none is found
 */
function lookup (mod) {
    var remainingDepth = MAX_DEPTH;
    do {
        if (cache[mod.id]) return cache[mod.id];
        mod = mod.parent;
    } while (mod && --remainingDepth);
    
    return null;
}

/**
 * Adds a new context or gets existing context for the provided module, while ensuring that cache references for parent,
 * child, and current module contexts remain correct.
 * @param mod {Module} the module for which to cache context
 * @returns {LoggerContext} the found or created context
 */
function insert (mod) {
    // if the cache already had this module, use that context
    var existingContext = cache[mod.id];
    if (existingContext) return existingContext;
    
    // we'll also try to lookup the parent of this module so that we can add the new context as a child
    var parentContext = lookup(mod);
    
    // only after the parentContext has been found will we assign the new context to the cache
    var newContext = cache[mod.id] = new LoggerContext(mod);
    
    // make sure references get updated if parentContext exists
    if (parentContext) parentContext.addChild(newContext);
    
    return newContext;
}