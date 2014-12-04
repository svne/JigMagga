'use strict';
var inherits = require('util').inherits;
var format = require('util').format;
var _ = require('lodash');

var WorkerError = function (message, originalMessage, messageKey) {
    this.name = 'WorkerError';  

    this.originalMessage = originalMessage;
    this.messageKey = messageKey;
    this.message = message;
    Error.call(this, message);
};

inherits(WorkerError, Error);

exports.WorkerError = WorkerError;

/**
 * Handle errors
 * @param  {Function}   log      [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
exports.getErrorHandler = function (log, callback) {
    return function (err) {
        if (!(err instanceof WorkerError)) {
            var logMessage = format('Fatal error. process will be terminated %s, %s', err.message, err.stack);
            var logMeta = {uncaughtException: true, error: true};

            log('error', logMessage, logMeta);

            return setTimeout(function () {
              process.exit();
            }, 100);
        }
        callback(err);
    };
};

/**
 * creates an exit handler that has to kill all child processes before exit
 * @param {Function} log
 * @param {Array} childProcesses
 * @return {Function}
 */
exports.getExitHandler = function (log, childProcesses) {
   return function () {
       log('warn', 'process terminated remotely', {exit: true});
       childProcesses.forEach(function (child) {
           if (child && _.isFunction(child.kill)) {
               child.kill();
           }
       });
       process.exit();
   };
};

/**
 *
 * @param {Function} log
 * @param {QueuePool} queuePool
 * @param {storage} messageStorage
 * @param {object} program
 * @return {Function}
 */
exports.getWorkerErrorHandler = function (log, queuePool, messageStorage, program) {

    /**
     * handle non fatal error regarding with message parsing
     *
     * @param  {{origMessage: object, message: string, stack: string, messageKey: string}} err
     */
    return function workerErrorHandler(err) {
        var errorMessage = format('Error while processing message: %s',  err.message);
        err.originalMessage.error = true;
        log('error', errorMessage, err.originalMessage);

        if (!program.queue) {
            return;
        }

        //if there is shift function for this message in the storage shift message from main queue
        messageStorage.upload(err.messageKey);

        var originalMessage = err.originalMessage || {};
        originalMessage.error = err.message;

        if (program.queue) {
            queuePool.amqpErrorQueue.publish(originalMessage);

            if (!program.live && !originalMessage.upload) {
                messageStorage.done(err.messageKey);
            }
        }
    };
};
