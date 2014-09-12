'use strict';
var fs = require('fs'),
    archiver = require('./archiver');

var helper = require('./helper'),
    stream = require('./streamHelper'),
    parseArguments = require('../parseArguments'),
    WorkerError = require('./error').WorkerError;

var log = require('./logger')('worker', {component: 'worker', processId: String(process.pid)});
var config = require('../config');
var program = parseArguments(process.argv);

var getMeta = helper.getMeta;


var createUploaderStream = function (message, key, bucketName, uploaderRouter, redisClient) {
    return stream.accumulate(function(err, data, next) {
        var that = this;
        var cb =  function () {
            result = null;
            data = null;
            next();
        };
        var result = {bucketName: bucketName, url: message.url, data: data, messageKey: key};
        if (program.queue) {
            uploaderRouter.send('reduce:timeout');
            var redisKey = helper.getRedisKey(config.redis.keys.list, uploaderRouter.processInstance.pid);

            return redisClient.rpush(redisKey, JSON.stringify(result), function (err) {
                if (err) {
                    return that.emit('error', new WorkerError(err.message || err), data.message.origMessage);
                }
                log('generated message sent to redis', getMeta(message));
                cb();
            });
        }
        log('[WORKER] send message to upload', getMeta(message));
        uploaderRouter.send('pipe', result);
        cb();
    });
};

module.exports = function (uploaderRouter, queuePool, redisClient, errorHandler) {


    /**
     * generator pipe handler. Invokes for all messages that passes from
     * generator process via pipe.
     * Creates a zip archive from upload file list and write it to a disk
     * or send it to the uploader regarding to the value write key of application
     *
     * @param  {{uploadList: Object[], message: object, key: string}} data [description]
     */

    return function pipeHandler(data) {

        var archiverStream,
            destination,
            message,
            bucketName,
            key;

        try {
            data = JSON.parse(data);
        } catch (e) {
            log('error', e);
            errorHandler(e);
        }

        message = data.message;
        bucketName = data.bucketName;
        key = data.key;
        log('message from pipe generator, key %s', key,  getMeta(message));

        //send message to done queue
        if (program.queue) {
            queuePool.amqpDoneQueue.publish(message.origMessage);
        }

        if (program.write) {
            return helper.saveFiles(data.uploadList, log, function (err, res) {
                if (err) {
                    return log('error', err);
                }
                helper.executeAck(key);
                log('all files saved successfully');
            });
        }

        archiverStream = archiver.bulkArchive(data.uploadList);

        data = null;
        destination = createUploaderStream(message, key, bucketName, uploaderRouter, redisClient);

        var tc = stream.tryCatch();

        tc(archiverStream).pipe(tc(destination));

        tc.catch(errorHandler);
    };
};
