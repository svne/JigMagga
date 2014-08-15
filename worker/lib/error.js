'use strict';
var inherits = require('util').inherits;

var WorkerError = function (message, originalMaessage, messageKey) {
    this.name = 'WorkerError';  

    this.originalMaessage = originalMaessage;
    this.messageKey = messageKey;
    this.message = message;
    Error.call(this, message);
};

inherits(WorkerError, Error);

exports.WorkerError = WorkerError;

/**
 * Handle errors
 * @param  {[type]}   log      [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
exports.getErrorHandler = function (log, callback) {
    return function (err) {
        console.log('getErrorHandler');
        if (!(err instanceof WorkerError)) {
            log('error', 'Fatal error. process will be terminated %s, %s', err.message, err.stack, {uncaughtException: true});
            process.kill();
        }
        callback(err);
    };
};