module.exports = injector;

var cache = {};
var MAX_DEPTH = 20;


var noop = function () {};
var frozenNoop = {value: noop, enumerable: true, configurable: false, writable: false};
var noopLogger = Object.defineProperties({}, {
    log: frozenNoop,
    debug: frozenNoop,
    info: frozenNoop,
    warn: frozenNoop,
    error: frozenNoop,
    fatal: frozenNoop
});

var defaultLogger = Object.freeze(noopLogger);

Object.defineProperty(module.exports, 'defaultLogger', {
    configurable: false,
    get: function () {
        return defaultLogger;
    },
    set: function (logger) {
        defaultLogger = logger || noopLogger;
    }
})

function injector (obj, property, definition) {
    if (!(obj instanceof module.constructor)) throw new Error('obj parameter must be a module object');

    var cached = insert(obj),
        exports = obj.exports;
    
    var def = definition || {};
    
    
    Object.defineProperty(obj, 'exports', {
        get: function () { return exports; },
        set: function (val) {
            exports = Object.defineProperty(val, property || 'logger', {
                configurable: def.configurable === undefined || !!def.configurable, // defaults to true
                enumerable: !!def.enumerable, // defaults to false
                get: function () {
                    var logger = cached.logger;
                    return def.get instanceof Function ? def.get(logger) : logger;
                },
                set: function (logger) {
                    cached.logger = def.set instanceof Function ? def.set(logger) : logger;
                }
            });
        }
    });
    
    obj.exports = exports;
    
    return contextualLogger(cached);
}

function contextualLogger (ctx) {
    function frozenFn (name) {
        return {
            value: function () {
                var logger = ctx.logger;
                return (logger[name] || defaultLogger[name] || noopLogger[name]).apply(logger, arguments);
            },
            enumerable: true,
            configurable: false,
            writable: false
        };
    }
    var ctxLogger = Object.defineProperties({}, {
        log: frozenFn('log'),
        debug: frozenFn('debug'),
        info: frozenFn('info'),
        warn: frozenFn('warn'),
        error: frozenFn('error'),
        fatal: frozenFn('fatal')
    });
    
    return Object.freeze(ctxLogger);
}

function Wrapper (obj) {
    var logger = null,
        children = {},
        parent = null;
    Object.defineProperty(this, 'logger', {
        set: function (newLogger) {
            if (newLogger === undefined) newLogger = parent && parent.logger;
            Object.keys(children).forEach(function(id) {
                if (children[id].logger === defaultLogger || children[id].logger === logger) children[id].logger = newLogger;
            });
            logger = newLogger;
        },
        get: function () {
            return logger || defaultLogger;
        }
    })
    this.id = obj.id;
    this.addChild = function (obj) {
        obj.setParent(this);
        children[obj.id] = obj;
    }
    this.setParent = function (obj) {
        parent = obj;
    }
}

function lookup (obj) {
    var mod = obj,
        remainingDepth = MAX_DEPTH;
    do {
        if (cache[mod.id]) return cache[mod.id];
        mod = mod.parent;
    } while (mod && --remainingDepth);
    
    return null;
}

function insert (obj) {
    var newWrapper = new Wrapper(obj);
    var cached = lookup(obj) || newWrapper;
    cache[obj.id] = cache[obj.id] || newWrapper;
    if (cached !== newWrapper) cached.addChild(newWrapper);
    return newWrapper;
}