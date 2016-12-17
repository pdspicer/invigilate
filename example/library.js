var logger = require('..')(module);
var child = require('./child');

module.exports = function () {
    logger.info('in libary');
    child();
};

module.exports.child = child;

logger.info('should be silent');