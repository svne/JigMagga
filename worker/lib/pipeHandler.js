'use strict';
var archiver = require('./archiver');

var helper = require('./helper'),
    messageStorage = require('./message').storage,
    stream = require('./streamHelper'),
    parseArguments = require('../parseArguments');

var log = require('./logger')('worker', {component: 'worker', processId: String(process.pid)});
var program = parseArguments(process.argv);

var getMeta = helper.getMeta;


var createUploaderStream = function (message, key, bucketName, uploaderRouter) {
    return stream.accumulate(function(err, data, next) {
        var result = {
            bucketName: bucketName,
            url: message.url,
            page: message.page,
            data: data,
            messageKey: key
        };

        log('[WORKER] send message to upload', getMeta(message));
        uploaderRouter.send('pipe', result);
        result = null;
        data = null;
        next();
    });
};

module.exports = function (uploaderRouter, queuePool, errorHandler) {


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
            errorHandler(e);
        }

        message = data.message;
        bucketName = data.bucketName;
        key = data.key;
        log('message from pipe generator, key %s', key,  getMeta(message));

        //send message to done queue
        if (!program.live) {
            messageStorage.done(key);
        }

        if (program.write) {
            return helper.saveFiles(data.uploadList, log, function (err) {
                if (err) {
                    return log('error', err);
                }
                messageStorage.upload(key);
                log('all files saved successfully');
            });
        }

        archiverStream = archiver.bulkArchive(data.uploadList);

        data = null;
        destination = createUploaderStream(message, key, bucketName, uploaderRouter);

        var tc = stream.tryCatch();

        tc(archiverStream).pipe(tc(destination));

        tc.catch(errorHandler);
    };
};
