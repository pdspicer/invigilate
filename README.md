# invigilate

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