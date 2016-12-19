var invigilate = require('..'),
    cache = require('../lib/cache'),
    loggers = require('../lib/loggers'),
    LoggerProxy = require('../lib/proxy'),
    LoggerContext = require('../lib/context'),
    should = require('should');

var mod = null, log = null;

var sortFn = function (a, b) { return a >= b ? 1 : -1; },
    ENUMERABLE_PROPERTIES = ['cache', 'loggers'].sort(sortFn);

function initMod (id, parent) {
    log = null;
    mod = new module.constructor(id, parent);
}

describe('Configuration', function () {
    context('initial state', function () {
        before(function () { initMod(); });
        
        it('should not have any value for the logger property descriptor', function () {
            should.not.exist(Object.getOwnPropertyDescriptor(mod.exports, 'logger'));
        });
        
        it('should expose ' + ENUMERABLE_PROPERTIES.join(', ') + ' as enumerable properties', function () {
            Object.keys(invigilate).sort(sortFn).should.eql(ENUMERABLE_PROPERTIES);
        });
        
        it('should expose cache as the same config object set in lib/cache', function () {
            invigilate.cache.should.equal(cache.config);
        });

        it('should expose loggers as the same object exported in lib/loggers', function () {
            invigilate.loggers.should.equal(loggers);
        });
        
        it('should initially have the default logger set to the silent logger', function () {
            invigilate.loggers.default.should.equal(invigilate.loggers.silent);
        });
        
        ENUMERABLE_PROPERTIES.forEach(function (property) {
            it('should list the ' + property + ' property as non-configurable', function () {
                invigilate.should.have.propertyWithDescriptor(property, {configurable: false, enumerable: true});
            });
        });
    });
    
    context('failure cases', function () {
        beforeEach(function () { initMod(); });
        
        function injectorErrorTest (mod, prop, desc) {
            var err = null;
            if (prop && desc) Object.defineProperty(mod.exports, prop, desc);
            try { invigilate(mod); }
            catch (error) { err = error; }
            should.exist(err);
        }
        
        it('should throw an error if no module is provided', function () {
            injectorErrorTest();
        });
        
        it('should throw an error if the provided value is not a module object', function () {
            injectorErrorTest({});
        });
        
        it('should throw an error if the property being defined is already defined as not configurable', function () {
            injectorErrorTest(mod, 'logger', {configurable: false});
        });
    
        it('should throw an error if the property being defined is already defined as not writable', function () {
            injectorErrorTest(mod, 'logger', {writable: false});
        });
    
        it('should throw an error if the property being defined is already defined with a value', function () {
            injectorErrorTest(mod, 'logger', {value: 'something'});
        });
    
        ENUMERABLE_PROPERTIES.forEach(function (property) {
            it('should throw an error if trying to redefine the ' + property + ' property descriptor', function () {
                var err = null;
                try { Object.defineProperty(invigilate, property, {value: 'something'}); }
                catch (error) { err = error; }
                should.exist(err);
            });
        });
    });
    
    context('global configuration', function () {
        describe('cache config', function () {
            var oldDepth = null;
            before(function () {
                oldDepth = invigilate.cache.MAX_DEPTH;
            });
            
            after(function () {
                invigilate.cache.MAX_DEPTH = oldDepth;
            });
            
            it('should set the cache max depth if set from the invigilate exports', function () {
                var newDepth = 30;
                invigilate.cache.MAX_DEPTH = newDepth;
                cache.config.MAX_DEPTH.should.equal(newDepth);
                invigilate.cache.MAX_DEPTH.should.equal(newDepth);
            });
            
            it('should return an array of module ids for those already cached', function () {
                invigilate.cache.keys.should.be.an.Array();
            });
            
            it('should not do anything if attempting to reassign cache.keys', function () {
                invigilate.cache.keys = 'something';
                invigilate.cache.keys.should.be.an.Array();
            });
            
            it('should ignore any updates to max depth that are NaN values', function () {
                var currentDepth = invigilate.cache.MAX_DEPTH;
                invigilate.cache.MAX_DEPTH = 'not a number';
                invigilate.cache.MAX_DEPTH.should.equal(currentDepth);
            });
            
            it('should use the minimum value of 0 if a less than 0 value is provided', function () {
                invigilate.cache.MAX_DEPTH = -1;
                invigilate.cache.MAX_DEPTH.should.equal(0);
            });
        });
        
        describe('default logger config', function () {
            var oldLogger = null;
            
            before(function () {
                oldLogger = invigilate.loggers.default;
            });
    
            after(function () {
                invigilate.loggers.default = oldLogger;
            });
            
            afterEach('enforce equality of invigilate default and loggers default', function () {
                invigilate.loggers.default.should.equal(loggers.default);
            });
            
            it('should set the default logger to any provided object', function () {
                var testLogger = {};
                invigilate.loggers.default = testLogger;
                invigilate.loggers.default.should.equal(testLogger);
            });
            
            it('should set the default logger to the silent logger if the provided value is falsey', function () {
                invigilate.loggers.default = null;
                invigilate.loggers.default.should.equal(oldLogger);
            });
        });
    });
    
    function configurationTest (prop, desc, expectedDesc) {
        var context = null,
            expectedProp = prop || 'logger';
        expectedDesc = expectedDesc || {enumerable: false, configurable: true};
        before(function () {
            initMod(module.id, null);
            log = invigilate(mod, prop, desc);
            context = cache.lookup(mod);
        });
        
        it('should add a configurable, non-enumerable logger property to module.exports', function () {
            mod.exports.should.have.propertyWithDescriptor(expectedProp, expectedDesc);
        });
        
        it('should set the initial value of module.exports.logger to logger.default', function () {
            mod.exports[expectedProp].should.equal(invigilate.loggers.default);
        });
        
        it('should add module.id to the cache keys', function () {
            invigilate.cache.keys.should.containEql(mod.id);
        });
        
        it('should add a context object for the module', function () {
            should.exist(context);
            context.should.be.an.instanceOf(LoggerContext);
            context.id.should.eql(mod.id);
        });
        
        it('should return a proxy for the default logger', function () {
            should.exist(log);
            log.should.be.an.instanceOf(LoggerProxy);
        });
        
        it('should provide enumerable methods for all logging capabilities on the returned proxy', function () {
            var levels = ['log', 'debug', 'info', 'warn', 'error', 'fatal'].sort(sortFn);
            Object.keys(log).sort(sortFn).should.eql(levels);
        });
        
        it('should use the default (silent) logger when calling all log methods', function () {
            var notSilent = false, err = null;
            var oldWrite = process.stdout.write;
            
            try {
                process.stdout.write = function () { notSilent = true; };
                Object.keys(log).forEach(function (method) {
                    log[method]('some output');
                });
            }
            catch (error) { err = error; }
            process.stdout.write = oldWrite;
            
            should.not.exist(err);
            notSilent.should.be.false();
        });
        
        it('should not overwrite the property even if exports is reassigned', function () {
            mod.exports = {};
            mod.exports.should.have.propertyWithDescriptor(expectedProp, expectedDesc);
        });
        
        it('should allow the property to be assigned to a primitive, without the property', function () {
            mod.exports = 'something';
            var value = mod.exports[expectedProp];
            mod.exports = {};
            should.not.exist(value);
        });
    }
    
    context('default configuration', function () {
        configurationTest();
        
        it('should pass the value sent to the get directly through if no getter is set', function () {
            mod.exports.logger.should.equal(invigilate.loggers.default);
        });
        
        it('should pass the value sent to the setter directly through if no setter is set', function () {
            var obj = {};
            mod.exports.logger = obj;
            var result = mod.exports.logger;
            
            // reset here so other tests are unaffected
            mod.exports.logger = null;
            
            result.should.equal(obj);
        });
    });
    
    context('custom configuration', function () {
        var calledGetter = false,
            calledSetter = false;
        configurationTest('custom', {
            enumerable: true,
            configurable: false,
            get: function (val) {
                calledGetter = true;
                return val;
            },
            set: function (val) {
                calledSetter = true;
                return null;
            }
        }, {
            enumerable: true,
            configurable: false
        });
        
        it('should call the specified getter when getting the custom value', function () {
            var x = mod.exports.custom;
            should.exist(x);
            calledGetter.should.be.true();
        });
        
        it('should call the specified setter when setting the custom value', function () {
            mod.exports.custom = 'something';
            calledSetter.should.be.true();
            mod.exports.custom.should.equal(loggers.default);
        });
    });
});

describe('Logger', function () {
    before(function () {
        initMod(module.id, null);
        log = invigilate(mod);
    });
    
    it('should use the default logger function for any instance logger function that is not defined', function () {
        var called = {log: false, debug: false, info: false, warn: false, error: false, fatal: false};
        mod.exports.logger = {};
        invigilate.loggers.default = {
            log: function () { called.log = true; },
            debug: function () { called.debug = true; },
            info: function () { called.info = true; },
            warn: function () { called.warn = true; },
            error: function () { called.error = true; },
            fatal: function () { called.fatal = true; }
        };
        Object.keys(log).forEach(function (method) {
            log[method]('some output');
        });
        
        Object.keys(called, function (method) {
            called[method].should.be.true();
        });
    });
    
    it('should use the silent logger for any instance AND default logger functions that are not defined', function () {
        var notSilent = false, err = null;
        var oldWrite = process.stdout.write;
        mod.exports.logger = invigilate.loggers.default = {};
        try {
            process.stdout.write = function () { notSilent = true; };
            Object.keys(log).forEach(function (method) {
                log[method]('some output');
            });
        }
        catch (error) { err = error; }
        process.stdout.write = oldWrite;
        
        should.not.exist(err);
        notSilent.should.be.false();
    });
    
    it('should use the provided instance logger function when it is provided', function () {
        var called = {log: false, debug: false, info: false, warn: false, error: false, fatal: false};
        mod.exports.logger = {
            log: function () { called.log = true; },
            debug: function () { called.debug = true; },
            info: function () { called.info = true; },
            warn: function () { called.warn = true; },
            error: function () { called.error = true; },
            fatal: function () { called.fatal = true; }
        };
        Object.keys(log).forEach(function (method) {
            log[method]('some output');
        });
    
        Object.keys(called, function (method) {
            called[method].should.be.true();
        });
    });
});

describe('Cache', function () {
    var mods = [],
        maxDepth = 20,
        maxMod = maxDepth - 1;
    function initN (n, pre) {
        var list = [],
            prefix = pre || '';
        var parent, current;
        for (var i = 0; i < n; i++) {
            current = new module.constructor(prefix + i, parent);
            list.push(current);
            parent = current;
        }
        return list;
    }
    
    before(function () {
        invigilate.cache.MAX_DEPTH = maxDepth;
        invigilate.loggers.default = null;
        mods = initN(maxDepth, 'mods');
    });
    
    context('initial state', function () {
        it('should have none of the modules included before invigilate is called for any of them', function () {
            mods.forEach(function (mod) {
                should.not.exist(cache.lookup(mod));
            });
        });
    });
    
    context('adding context for a "root" module', function () {
        var context;
        before(function () {
            invigilate(mods[0]);
            context = cache.lookup(mods[0]);
        });
        
        it('should exist in the cache for the module when invigilate is called', function () {
            should.exist(context);
        });
        
        it('should have a parent value of null', function () {
            should.not.exist(context.parent);
        });
        
        it('should have an empty list of children', function () {
            context.children.should.be.an.Array().and.have.length(0);
        });
        
        it('should initially use the default logger', function () {
            context.logger.should.equal(invigilate.loggers.default);
        });
        
        it('should not allow any updates to children', function () {
            context.children = 'something';
            context.children.should.be.an.Array().and.have.length(0);
        });
    });
    
    context('adding context for a "child" module at depth <= MAX_DEPTH', function () {
        var parentContext, childContext;
        before(function () {
            invigilate(mods[0]);
            parentContext = cache.lookup(mods[0]);
            parentContext.logger = console;
            invigilate(mods[maxMod]);
            childContext = cache.lookup(mods[maxMod]);
        });
        
        it('should exist in the cache for the module when invigilate is called', function () {
            should.exist(childContext);
        });
        
        it('should have a parent value equal to the parent context', function () {
            childContext.parent.should.equal(parentContext);
        });
        
        it('should add the child context to the parent context', function () {
            parentContext.children[0].should.equal(childContext.id);
        });
        
        it('should initialize the child context logger to the parent context logger', function () {
            childContext.logger.should.equal(console);
        });
        
        describe('cascading logger updates', function () {
            var testLogger = {};
            beforeEach(function () {
                parentContext.logger = testLogger;
            });
            
            afterEach(function () {
                childContext.logger = parentContext.logger = undefined;
            });
            it('should update the child logger when the parent logger is updated', function () {
                childContext.logger.should.equal(testLogger);
            });
    
            it('should revert the child logger to default if the parent logger is reset', function () {
                parentContext.logger = null;
                childContext.logger.should.equal(loggers.default);
            });
            
            context('child logger unsynchronized from parent using default logger', function () {
                beforeEach(function () {
                    childContext.logger = null;
                });
    
                it('should only update the child logger if it is set to be different from the parent', function () {
                    childContext.logger.should.equal(loggers.default);
                    parentContext.logger.should.equal(testLogger);
                });
                
                it('should resynchronize the child logger if the parent logger is set again', function () {
                    parentContext.logger = testLogger;
                    childContext.logger.should.equal(testLogger);
                });
            });
            
            context('child logger unsynchronized from parent using custom logger', function () {
                var customLogger = {};
                beforeEach(function () {
                    childContext.logger = customLogger;
                });
                
                it('should be referentially different from the parent logger', function () {
                    childContext.logger.should.not.equal(parentContext.logger);
                });
                
                it('should not resynchronize the child logger if the parent logger is set again', function () {
                    parentContext.logger = testLogger;
                    childContext.logger.should.equal(customLogger);
                });
                
                it('should revert to default logger if null is provided as a logger value', function () {
                    childContext.logger = null;
                    childContext.logger.should.equal(loggers.default);
                });
                
                it('should revert to the parent logger if undefined is provided as a logger value', function () {
                    childContext.logger = undefined;
                    childContext.logger.should.equal(parentContext.logger);
                });
            });
        });
    });
    
    context('adding context for a "child" module at depth > MAX_DEPTH', function () {
        var parentContext, childContext, deepMods;
        before(function () {
            deepMods = initN(maxDepth + 1, 'deep');
            invigilate(deepMods[0]);
            parentContext = cache.lookup(deepMods[0]);
            parentContext.logger = console;
            invigilate(deepMods[maxDepth]);
            childContext = cache.lookup(deepMods[maxDepth]);
        });
        
        it('should exist in the cache for the module when invigilate is called', function () {
            should.exist(childContext);
        });
        
        it('should have a parent value equal to null if it is beyond MAX_DEPTH levels away', function () {
            should.not.exist(childContext.parent);
        });
        
        it('should not add the child context to the parent context', function () {
            parentContext.children.should.be.an.Array().and.have.length(0);
        });
        
        it('should not initialize the child context logger to the parent context logger', function () {
            childContext.logger.should.not.equal(parentContext.logger);
        });

        it('should not update the child logger when the parent logger is updated', function () {
            var testLogger = {};
            parentContext.logger = testLogger;
            childContext.logger.should.not.equal(testLogger);
        });
    });
    
    context('adding context for a "grandchild" module at depth <= MAX_DEPTH', function () {
        var parentContext, childContext, grandchildContext, veryDeepMods;
        before(function () {
            veryDeepMods = initN(maxDepth * 2 - 1, 'veryDeep');
            invigilate(veryDeepMods[0]);
            parentContext = cache.lookup(veryDeepMods[0]);
            parentContext.logger = console;
            invigilate(veryDeepMods[maxMod]);
            childContext = cache.lookup(veryDeepMods[maxMod]);
            invigilate(veryDeepMods[maxMod * 2]);
            grandchildContext = cache.lookup(veryDeepMods[maxMod * 2]);
        });
        
        it('should exist in the cache for the module when invigilate is called', function () {
            should.exist(grandchildContext);
        });
        
        it('should have a parent value equal to the child context', function () {
            grandchildContext.parent.should.equal(childContext);
        });
        
        it('should add the grandchild context to the child context', function () {
            childContext.children[0].should.equal(grandchildContext.id);
        });
        
        it('should initialize the grandchild context logger to the parent context logger', function () {
            grandchildContext.logger.should.equal(parentContext.logger);
        });
        
        describe('cascading logger updates', function () {
            var testLogger = {};
            beforeEach(function () {
                parentContext.logger = testLogger;
            });
            
            afterEach(function () {
                grandchildContext.logger = childContext.logger = parentContext.logger = undefined;
            });
            it('should update the grandchild logger when the parent logger is updated', function () {
                grandchildContext.logger.should.equal(testLogger);
            });
            
            it('should revert the grandchild logger to default if the parent logger is reset', function () {
                parentContext.logger = null;
                grandchildContext.logger.should.equal(loggers.default);
            });
            
            context('grandchild logger unsynchronized from parent using default logger', function () {
                beforeEach(function () {
                    grandchildContext.logger = null;
                });
                
                it('should resynchronize the grandchild logger if the parent logger is set again', function () {
                    parentContext.logger = testLogger;
                    grandchildContext.logger.should.equal(testLogger);
                });
            });
            
            context('grandchild logger unsynchronized from parent using custom logger', function () {
                var customLogger = {};
                beforeEach(function () {
                    grandchildContext.logger = customLogger;
                });
                
                it('should be referentially different from the parent logger', function () {
                    grandchildContext.logger.should.not.equal(parentContext.logger);
                });
                
                it('should not resynchronize the child logger if the parent logger is set again', function () {
                    parentContext.logger = testLogger;
                    grandchildContext.logger.should.equal(customLogger);
                });
                
                it('should revert to default logger if null is provided as a logger value', function () {
                    grandchildContext.logger = null;
                    grandchildContext.logger.should.equal(loggers.default);
                });
                
                it('should revert to the parent logger if undefined is provided as a logger value', function () {
                    grandchildContext.logger = undefined;
                    grandchildContext.logger.should.equal(parentContext.logger);
                });
            });
        });
    });
});