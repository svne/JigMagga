'use strict';

var es = require('event-stream'),
    _ = require('lodash'),
    EventEmitter = require('events').EventEmitter;

var stream = require('./streamHelper'),
    configMerge = require('./configMerge'),
    messageHelper = require('./message'),
    error = require('./error'),
    helper = require('./helper');

var generatorStream = require('../generator/index');

var log = require('./logger')('worker', {component: 'worker', processId: process.pid}),
    TimeDiff = require('./timeDiff');

var timeDiff = new TimeDiff(log);
var config = require('../config');

var messageStorage = messageHelper.storage;

/**
 * Pipes message from source stream to filter stream then to configuration
 * then split them by locale or pages and then send a messages to generator process
 *
 * @param  {Readable} source
 * @param  {object}   generator
 */
module.exports = function (source, uploader, basePath, program) {
    var tc = stream.tryCatch('err');
    var emitter = new EventEmitter();

    tc(source)
        .pipe(tc(es.through(function (data) {
            if (!helper.isMessageFormatCorrect(data.message, config)) {
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

            data.basePath = basePath;
            emitter.emit('new:message', helper.getMeta(data.message));



            this.emit('data', data);
        })))
        .pipe(tc(configMerge.getConfigStream()))
        .pipe(tc(messageHelper.pageLocaleSplitter()))
        .pipe(es.through(function (data) {
            messageStorage.add(data.key, data.onDone, data.queueShift);
            data.onDone = data.queueShift = null;
            this.emit('data', data);
        }))
        //add page configs for those messages that did not have page key before splitting
        .pipe(tc(configMerge.getConfigStream()))
        .on('data', function (data) {

            data.message = messageHelper.createMessage(data.message, program, data.config);
            data.bucketName = helper.generateBucketName(data, program, config.main.knox.buckets);
            //generator.send('new:message', data);

            generatorStream.write(data);

            //emitter.emit('send:message', helper.getMeta(data.message));
        });

    generatorStream.on('new:uploadList', function (data) {
        uploader.send('pipe', data);
        data = null;
    });

    /**
     * if zip is creating in the generator. Generator just send a link to it
     * to the worker and worker proxies this message to uploader
     *
     * @param  {{zipPath: string, message: object}} data
     */
    generatorStream.on('new:zip', function (data) {
        log('new zip saved by generator', helper.getMeta(data.message));
        if (!program.live) {
            messageStorage.done(data.key);
        }

        uploader.send('new:zip', {
            url: data.message.url,
            page: data.message.page,
            locale: data.message.locale,
            zipPath: data.zipPath,
            bucketName: data.bucketName,
            messageKey: data.key
        });
    });

    tc.catch(function (error) {
        emitter.emit('error:message', error);
    });

    return emitter;
};
