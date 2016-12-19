var LoggerProxy = require('./proxy');
var loggers = require('./loggers');

// export the LoggerContext constructor
module.exports = LoggerContext;

/**
 * Constructs a new context for the provided module, including information about the most immediate parent that first
 * required this invigilate, any children of the module that subsequently required invigilate, the currently assigned
 * logger, and the module's id
 *
 * @param mod {Module} the module whose context is being define
 * @constructor
 */
function LoggerContext (mod) {
    this.id = mod.id;
    this.proxy = new LoggerProxy(this);
    
    // set up internal values that will be used with this context
    var logger = null,
        children = {},
        parent = null;
    
    // define a logger property that will ensure that this.logger is always defined, and cascades changes to children
    Object.defineProperties(this, {
        logger: {
            set: function setLogger (newLogger) {
                // reassign newLogger to the parent's logger only if undefined is explicitly provided as the set value
                if (newLogger === undefined) newLogger = parent && parent.logger;
            
                // loop through children and reassign their loggers if they were previously not set or were still
                // referentially tied to this context's logger
                Object.keys(children).forEach(function reassignChildLoggers (id) {
                    var childLogger = children[id].logger,
                        isDefault = childLogger === loggers.default,
                        isSame = childLogger === logger;
                    if (isDefault || isSame) children[id].logger = newLogger;
                });
            
                // reassign this context's logger once all children have been updated
                logger = newLogger;
            },
            get: function geLogger () {
                // ensure that a non-null logger value is always returned
                return logger || loggers.default;
            }
        },
        parent: {
            set: function setParent (newParent) {
                parent = newParent;
            },
            get: function getParent () {
                return parent;
            }
        },
        children: {
            set: function setChildren () {},
            get: function getChildren () {
                return Object.keys(children);
            }
        }
    });
    
    // function for adding children defined locally as child values are not exposed on the object
    this.addChild = function addChild (context) {
        context.parent = this;
        context.logger = this.logger;
        children[context.id] = context;
    };
}