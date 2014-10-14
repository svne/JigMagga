'use strict';

/**
 * represent a module that listen for new message
 * from pipe or ipc and upload them using
 * upload content or upload file method
 *
 * @module uploader
 */

var _ = require('lodash'),
    async = require('async'),
    Uploader = require('jmUtil').ydUploader,
    es = require('event-stream');

var log = require('../lib/logger')('uploader', {component: 'uploader', processId: String(process.pid)}),
    ProcessRouter  = require('../lib/router'),
    stream = require('../lib/streamHelper'),
    error = require('../lib/error'),
    TimeDiff = require('../lib/timeDiff');

if (process.env.NODE_ENV === 'live') {
    require('longjohn');
}


var timeDiff = new TimeDiff(log);

var WorkerError = error.WorkerError;

var config = require('../config');
log('started, pid', process.pid);

var router = new ProcessRouter(process);

var messageStream = stream.duplex();

var handleError = function (text, data) {
    log('error', text, {error: true});

    return router.send('error', new WorkerError(text, data.message.origMessage, data.key));
};


var uploaderStorage = {};

var getUploader = function (bucketName) {
    if (uploaderStorage[bucketName]) {
        return uploaderStorage[bucketName];
    }

    var knoxOptions = _.cloneDeep(config.main.knox);
    knoxOptions.S3_BUCKET = knoxOptions.S3_BUCKET || bucketName;

    uploaderStorage[bucketName] = new Uploader(knoxOptions);
    return uploaderStorage[bucketName];
};

router.addRoutes({
    pipe: function (data) {
        messageStream.write(data);
    },
    'new:zip': function (data) {
        messageStream.write(data);
    }
});

var uploadsAmount = 0;

/**
 * upload item using uploadFile method if there is a zipPath field
 * and uploadContent if there is a data field
 *
 * @param  {data}   data
 * @param  {Function} callback [description]
 */
var uploadItem = function (data, callback) {
    if (_.isString(data)) {
        data = JSON.parse(data);
    }
    var uploader = getUploader(data.bucketName);

    var uploadPageTimeDiff = timeDiff.create('upload:page');
    var next = function (err, res) {
        if (err) {
            handleError(err, {upload: true, url: data.url});
        } else {
            uploadsAmount += 1;
            log('success', res + ' time: ' + Date.now(),
                {upload: true, url: data.url, locale: data.locale, page: data.page, uploadsAmount: uploadsAmount});
            router.send('message:uploaded', data.messageKey);
        }
        uploadPageTimeDiff.stop();
        callback();
    };

    log('start uploading new file url: %s', data.url);

    var url = (data.url === '/') ? 'index' : data.url;

    if (data.zipPath) {
        return uploader.uploadFile(data.zipPath, url, {deleteAfter: true}, next);
    }

    uploader.uploadContent(new Buffer(data.data), url, {
        headers: {'X-Myra-Unzip': 1},
        type: 'application/octet-stream'
    }, next);
};

/**
 * returns stream that upload each message or array of messages
 *
 * @param  {object} source
 */
var uploadStream = function (source) {
    return es.map(function (data, callback) {
        var next = function (err, res) {
            if (source) {
                source.resume();
            }
            callback(err, res);
        };

        if (_.isArray(data)) {
            log('new data to upload type: array length:', data.length);
            return async.each(data, uploadItem, next);
        }

        log('new data to upload type: string');
        uploadItem(data, next);
    });
};


process.send({ready: true});

messageStream.pipe(uploadStream());


process.on('uncaughtException', error.getErrorHandler(log, function (err) {
    router.send('error', err);
}));

if (config.main.memwatch) {
    var memwatch = require('memwatch');

    memwatch.on('leak', function (info) {
        log('warn', '[MEMORY:LEAK] %j', info, {memoryLeak: true});
    });
}
