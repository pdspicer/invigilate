var library = require('./library');

function test (obj, testFn) {
    // set logger to console, now output will be displayed
    obj.logger = console;
    
    // call obj to see some log messages
    testFn();
    
    // reset the logger to the default, obj and all children will be silent
    obj.logger = null;
    testFn();
    
    // set the logger to a custom logger, obj and all children will use this logger
    obj.logger = {
        log: function () { console.log("REPLACEMENT LOGGER: LOG"); },
        debug: function () { console.log("REPLACEMENT LOGGER: DEBUG"); },
        info: function () { console.log("REPLACEMENT LOGGER: INFO"); },
        warn: function () { console.log("REPLACEMENT LOGGER: WARN"); },
        error: function () { console.log("REPLACEMENT LOGGER: ERROR"); },
        fatal: function () { console.log("REPLACEMENT LOGGER: FATAL"); }
    };
    testFn();
    
    // set the logger to undefined, will cause obj to revert to parent (which in this case is nothing, thus the default
    // will be used)
    obj.logger = undefined;
    testFn();
}

test(library, library);

library.logger = console;
test(library.child, library);