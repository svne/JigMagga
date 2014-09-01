'use strict';

var es = require('event-stream'),
    _ = require('lodash'),
    EventEmitter = require('events').EventEmitter;

var stream = require('./streamHelper'),
    configMerge = require('./configMerge'),
    messageHelper = require('./message'),
    error = require('./error'),
    helper = require('./helper');

var log = require('./logger')('worker', {component: 'worker', processId: process.pid}),
    TimeDiff = require('./timeDiff');

var timeDiff = new TimeDiff(log);

/**
 * Pipes message from source stream to filter stream then to configuration
 * then split them by locale or pages and then send a messages to generator process
 *
 * @param  {Readable} source
 * @param  {object}   generator
 */
module.exports = function (source, generator, basePath, program) {
    var tc = stream.tryCatch('err');
    var emitter = new EventEmitter();
    var generateMessageTimeDiff;

    tc(source)
        .pipe(tc(es.through(function (data) {
            if (!helper.isMessageFormatCorrect(data.message)) {
                if (_.isFunction(data.queueShift)) {
                    data.queueShift();
                }

                return this.emit('err', new error.WorkerError('something wrong with message fields', data.message));
            }

            if (data.message.url && !helper.isUrlCorrect(data.message.url)) {
                if (_.isFunction(data.queueShift)) {
                    data.queueShift();
                }
                return this.emit('err', new error.WorkerError('something wrong with message url', data.message));
            }
            generateMessageTimeDiff = timeDiff.create('generate:message');

            data.basePath = basePath;
            emitter.emit('new:message', helper.getMeta(data.message));

            this.emit('data', data);
        })))
        .pipe(tc(configMerge.getConfigStream()))
        .pipe(tc(messageHelper.pageLocaleSplitter()))
        .pipe(es.through(function (data) {
            helper.setAckToStorage(data);
            this.emit('data', data);
        }))
        //add page configs for those messages that did not have page key before splitting
        .pipe(tc(configMerge.getConfigStream()))
        .on('data', function (data) {
            data.message = messageHelper.createMessage(data.message, program, data.config);
            data.bucketName = helper.generateBucketName(data, program);

            generator.send('new:message', data);
            emitter.emit('send:message', helper.getMeta(data.message));
            generateMessageTimeDiff.stop();
        });

    tc.catch(function (error) {
        emitter.emit('error:message', error);
    });

    return emitter;
};
