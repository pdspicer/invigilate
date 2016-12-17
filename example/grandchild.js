var logger = require('..')(module);

module.exports = function () {
    logger.info('in grandchild');
};

logger.info('should be silent');