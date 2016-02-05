'use strict';

/**
 * represent a module that listen for new message
 * from pipe or ipc and upload them using
 * upload content or upload file method
 *
 * @module uploader
 */

var fs = require('fs'),
    _ = require('lodash'),
    async = require('async'),
    domain = require('domain'),
    request = require('request'),
    Uploader = require('jmUtil').ydUploader,
    es = require('event-stream');

var args = require('../parseArguments')(process.argv);

var log = require('../lib/logger')('uploader', {basedomain: args.basedomain}, args),
    ProcessRouter  = require('../lib/router'),
    error = require('../lib/error'),
    archiver = require('../lib/archiver'),
    stream = require('../lib/streamHelper'),
    helper = require('../lib/helper'),
    TimeDiff = require('../lib/timeDiff');



var timeDiff = new TimeDiff(log);

var WorkerError = error.WorkerError;

var config = require('../config');
log('started, pid', process.pid);

var router = new ProcessRouter(process);

var messageStream = stream.duplex();

var handleError = function (text, data, messageKey) {
    return router.send('error', new WorkerError(text, data, messageKey, error.STATUS_CODES.UPLOAD_ERROR));
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

var writeStream = function (message) {
    return stream.accumulate(function (err, data, next) {
        message.metadata.data = data;
        messageStream.write(message.metadata);

        return next();
    });
};

var uploadToColinCache = function (data, callback) {
    var colinConf = _.cloneDeep(config.colin);

    var base = colinConf.protocol + '://' + colinConf.hostname + ':' + colinConf.port;
    var endpoint = [base, data.domain, data.url].join('/').replace(/\.json$/, '');
    var requestOptions = {
        uri: endpoint,
        method: 'PUT',
        headers: {
            'content-type': 'application/json'
        },
        body: new Buffer(data.content)
    };

    var colin = function colin(next) {
        request(requestOptions, function (err, result, body) {
            if (err || result.statusCode >= 300) {
                if (body) {
                    log('warn', body);
                }
                return next(err || new Error('COLIN cache: Bad status code ' + result.statusCode));
            }

            next(null, endpoint);
        });
    };

    async.retry({ times: 5, interval: 200 }, colin, callback);
};

var colinStream = function (meta) {
    return es.map(function (data, callback) {
        var next = function (err, res) {
            if (err) {
                log('warn', 'Couldn\'t write to COLIN cache', err, {});
            }
            callback(null, res);
        };

        if (!args.colin) {
            return next();
        }

        if (_.isArray(data)) {
            log('new data to cache type: array length:', data.length);
            return async.each(data, uploadToColinCache, next);
        }

        log('new data to cache type: string');

        data = _.assign({}, meta, data, { domain: args.basedomain });

        uploadToColinCache(data, next);
    });
};

var colinStats = es.wait(function (err, body) {
    log(err ? 'warn' : 'info', 'Finished caching to COLIN', err ? err : body, {});
});

router.addRoutes({
    pipe: function (message) {
        var jsonFiles;

        message = helper.parsePipeMessage(message);

        jsonFiles = message.pages.filter(function (page) {
            return page.url.indexOf('json') !== -1;
        });

        es.readArray(jsonFiles)
            .pipe(colinStream(message.metadata))
            .pipe(colinStats)
            .on('error', function (err) {
                log('error', err);
                this.emit('end');
            })
            .on('end', function () {
                archiver.bulkArchive(message.pages)
                    .pipe(writeStream(message));
            });
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
 * @param  {Metadata}   data
 * @param  {Function} callback
 */
var uploadItem = function (data, callback) {
    if (_.isString(data)) {
        data = JSON.parse(data);
    }
    var uploader = getUploader(data.bucketName);

    var uploadPageTimeDiff = timeDiff.create('upload:page');
    var next = function (err, res) {
        if (err) {
            handleError(err, data.origMessage, data.messageKey);
        } else {
            uploadsAmount += 1;
            var logMetadata =
                {upload: true, url: data.url, locale: data.locale, page: data.page, uploadsAmount: uploadsAmount};
            log('success', res + ' time: ' + Date.now(), logMetadata);
            log('info', res, logMetadata);
            router.send('message:uploaded', data.messageKey);
        }
        uploadPageTimeDiff.stop();
        callback();
    };

    log('info', 'start uploading new file', helper.getMeta(data));

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
