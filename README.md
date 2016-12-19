# invigilate

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]

## Motivation
Logging is an important aspect of any project. It can be helpful during development to print process and state information,
and in deployment to track activity and diagnose issues that might occur. But when developing a library, logging 
considerations can have some important implications:
* Logging can become an obstacle to keeping dependencies lean and un-opinionated
* Log output is often undesired in a finished product, since dependants usually prefer not to see logged information from 
the libraries and packages they use. 
* Even when library developers decide to include output logging as a configuration option, it can complicate design if that 
configuration needs to passed around to various scripts within their library.

The purpose of invigilate is to deal with all of these issues in an unobtrusive fashion that allows implementers to:
* Design logging into their library without ever needing to configure it.
* Eliminate concerns about how logging fits into a specific design.
* Never become tied down to a specific logging implementation.
* Never worry about if and how end-users use it.

## Design
invigilate works by exposing a logger property on the export object of a module, and then cascading the value of that
property referentially to any child script required from that module that also requires invigilate. Each script that requires 
invigilate will also receive a proxy for the value of the logger property that will remain referentially tied to it's 
parent's value, regardless of what might be assigned to the base property at any point during exeuction. 

From the developer's perspective, the returned logging proxy never has to be changed, checked for existence, or anything 
of the sort, but it can be used wherever it is needed as if it was proxying to a fully functioning logger at all times, except 
that it will remain quiet until whatever point a real logger is provided.

## Usage
### Basic Usage
The most basic usage is as follows:
```javascript
var log = require('invigilate')(module);
```
This assigns a logger property to module.exports (i.e. `module.exports.logger`) so that it might be assigned from outside
the module, and returns a logging proxy that can be used just like a normal logger. invigilate actually extends the provided
module so that the property is persisted even after reassignment, so even if module.exports is assigned to an object or 
function, the property and its configuration persists:
```javascript
// log proxies the default logger
var log = require('invigilate')(module);

// default logger is accessible via the logger property
var logger = module.exports.logger;

// even after module.exports is assigned...
module.exports = function () { /* main export is a function */ };
// OR
module.exports = { /* main export is an object */ };

// ...logger is still available
logger === module.exports.logger;
```

### Full Usage
Full usage is the same as `Object.defineProperty`, except that the first argument must always be a module object. Described
below is the full usage of invigilate, shown with the defaults that are assigned to the second and third arguments if none
are provided:
```javascript
// default property name is 'logger', but this can be set to anything
var log = require('invigilate')(module, 'logger', {
    
    // default getter just returns the passed in
    get: function (currentLogger) { return currentLogger; },
    
    // default setter just sets the returned value
    set: function (newLogger) { return newLogger; },
    
    // default is to not enumerate this property, so that it does not interfere with existing code that enumerates properties
    enumerable: false,
    
    // default is to keep configurable so that end users might update this configuration
    configurable: true 
})
```

### Logger Methods
The returned logger exposes the following methods that developers can use: `fatal, error, warn, info, debug, log`.
At no point is it required that any or all of these method be defined through the exposed `module.exports.logger` property,
if they are missing then the default logger will be used (and if the default doesn't have them then they will be handled
silently).

### The Default Logger
The default logger is simply a silent logger that will not do anything when called. This logger is exposed on the invigilate
exports under a loggers property. Both it and the silent logger it is derived from can be accessed through this property:
```javascript
var invigilate = require('invigilate');

var silent = invigilate.loggers.silent,
    defaultLogger = invigilate.loggers.default;

// initially these will be the same
defaultLogger === silent;
```
The default logger can be redefined and set to anything, with the assurance that if any of the log methods listed above are 
missing, that the silent logger will always be used as a fallback:
```javascript
var invigilate = require('invigilate');
var log = invigilate(module);
invigilate.loggers.default = {};

// this will still work without issue
log.info('some messasge');
```
Regardless of where the default logger is set, every invigilate instance will pick up the change and start using the new 
default if another logger is not already overriding it for an individual instance.

### Logger Cache
invigilate stores a cache of modules that have called it, and this cache is configured to cascade logging configuration 
updates down through the parent/child chain of modules up to 20 levels. If this is not enough (or maybe too much), the cache
max. depth is configurable as well through the cache property of the invigilate exports. Cached module ids can also be 
retrieved this way:
```javascript
var invigilate = require('invigilate');

var maxDepth = invigilate.cache.MAX_DEPTH,
    cached = invigilate.cache.keys;

// only follow parent/child module relations down 2 levels
invigilate.cache.MAX_DEPTH = 2;
```
The cached logging contexts are not exposed intentionally to preserve their integrity. Max. depth can be set to any positive
integer (all negative values will result in 0 being set, everything else will be ignored).

## Cascading
Loggers cascade from parents to children, where the parent-child relationship is defined by the node, require() system,
such that the first time a module is required, it's parent is set to the module that required it at that point. All 
descendants down the chain will inherit their logger from the nearest parent to have a value explicitly assigned to its 
logger property.

The series of sample modules in the examples directory illustrates this relationship, where parent-child order is as follows:
`index.js -> library.js -> child.js -> grandchild.js`

Specifically, library.js shows how the child's logging property can be set in different ways that cascade to both child &
grandchild:
* When the library is first required, the logging property has only just been defined, thus the default logger is in use 
and remains silent. 
* If the parent updates the logger property, then the library and its descendants begin displaying log messages using the 
updated logger. 
* If the library redefines its child's logger property to null, then the child and its descendents revert to using the 
default logger (silent). 
* If the library redefines its child's logger to a custom logger, then the child and its decendents begin displaying log 
messages using the custom logger.
* If the library redefines its child's logger to undefined, then the child and its descendents begin using the library's
logger.

## License
Copyright (c) 2016, Paul Spicer.
Licensed under [MIT][].

[MIT]: ./LICENSE
[travis-badge]: https://travis-ci.org/pdspicer/invigilate.svg?branch=master
[travis-url]: https://travis-ci.org/pdspicer/invigilate
[npm-badge]: https://badge.fury.io/js/invigilate.svg
[npm-url]: https://badge.fury.io/js/invigilate
[coveralls-badge]: https://coveralls.io/repos/github/pdspicer/invigilate/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/pdspicer/invigilate?branch=master