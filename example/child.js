var logger = require('..')(module);
var grandchild = require('./grandchild');

module.exports = function () {
    logger.info('in child');
    grandchild();
};

module.exports.grandchild = grandchild;

logger.info('should be silent');