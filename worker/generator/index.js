'use strict';

/**
 * Generator module. Obtains new message from worker,
 * Call api, generate JSON and HTML files
 */

var EventEmitter = require('events').EventEmitter,
    format = require('util').format,
    fsExtra = require('fs-extra'),
    util = require('util'),
    fs = require('fs'),
    async = require('async'),
    _ = require('lodash'),
    path = require('path'),
    es = require('event-stream');

var messageStorage = require('../lib/message').storage;

var log = require('../lib/logger')('generator', {component: 'generator', processId: process.pid}),
    archiver = require('../lib/archiver'),
    helper = require('../lib/helper'),
    stream = require('../lib/streamHelper'),
    ydGetText = require('jmUtil').ydGettext,
    generateConfig = require('./lib/generateConfig'),
    generator = require('./lib/generator'),
    error = require('../lib/error'),
    TimeDiff = require('../lib/timeDiff');

var timeDiff = new TimeDiff(log);
var config = require('../config');


//init process router
//var router = new ProcessRouter(process);
log('started, pid', process.pid);

var messageStream = stream.duplex();

//router.addRoutes({
//    /**
//     * write to message stream the message that comes from generator
//     * @param  {Object} data
//     */
//    'new:message': function (data) {
//
//        console.log('THAT IS END', data);
//
//        return router.send('message:uploaded', data.key);
//
//
//        //messageStream.write(data);
//    },
//
//    'message:uploaded': function (key) {
//        log('deleting api cache for message with key %s', key);
//        generator.deleteCachedCall(key);
//    }
//});

var handleError = function (text, data) {
    log('error', text, {error: true});

    //return router.send('error', new WorkerError(text, data.message.origMessage, data.key));
};
/**
 * merge all configs and create viewContainer
 * @param  {object}   data [data from worker]
 * @param  {Function} next
 * @return {stream}
 */
var configStream = es.through(function (data) {
    var that = this;

    generateConfig(data, config, function (err, res) {
        if (err) {
            handleError(err.stack || err, data);
            return;
        }

        that.emit('data', res);
    });
});

var emitter = new EventEmitter();
emitter.on('call:parsing', function (name, config) {
    log('Parsing call for jig %s config: %j', name, config, {api:true});
});
emitter.on('call:success', function (requestId, time, fromCache) {
    log('Api call success for %s', requestId, {api: true});

    if (!fromCache) {
        log('time diff for %s in msec: %d', requestId, time, {timediff: true, diff: time, prefix: 'rest:call'});
    }
});

emitter.on('config:ready', function (readyConfigsLength, configsLength, url) {
    log('Config %d of %d for %s', readyConfigsLength, configsLength, url, {api: true});
});

/**
 * makes an api call for each message that comming to stream
 * returns the same data object with api call results in apiCallResult field
 *
 * @param  {object}   data
 * @param  {Function} next
 */
var apiStream = es.through(function (data) {
    var that = this;
    log('[*] send api request', helper.getMeta(data.message));
    log('help', 'generating new message time %d', Date.now(), helper.getMeta(data.message));
    // Take first snapshot
    // var apiMessageKey = generator.createApiMessageKey(data.key);
    var apiCallTimeDiff = timeDiff.create('apiCall:message:' + data.message.page);

    data.config.apiMessageKey = data.key;

    generator.apiCalls([data.config], emitter, function (err, res) {

        if (err) {

            var errorText = format('error in apiCall %s', util.inspect(err));
            return handleError(errorText, data);
        }
        data.apiCallResult = res;
        apiCallTimeDiff.stop();
        return that.emit('data', data);
    });

});

var lastLocale = {};
/**
 * loads locale file for each message if the file for that locale was not
 * loaded before
 *
 * @param  {object}   data
 */
var loadLocale = es.through(function (data) {
    var that = this,
        domain = data.message.domain,
        locale = data.message.locale;

    if (lastLocale[domain + locale]) {
        log('got from cache', {loadLocale: true, source: 'cache'});
        return that.emit('data', data);
    }
    ydGetText.locale(data.basePath, domain, locale, function () {
        log('loaded locale', {loadLocale: true, source: 'load'});
        lastLocale[domain + locale] = true;
        that.emit('data', data);
    });

});

/**
 * @name Metadata
 * @type {{
 *     bucketName: {String},
 *     url: {String},
 *     page: {String},
 *     locale: {String},
 *     messageKey: {String}
 * }}
 */


/**
 *
 * @param {String} message
 * @param {String} key
 * @param {String} bucketName
 * @param {Array.<UploadItem>} uploadPages
 */
var sendToWorker = function (message, key, bucketName, uploadPages) {

    var metaData = {
        bucketName: bucketName,
        url: message.url,
        page: message.page,
        locale: message.locale,
        messageKey: key
    };

    //console.log('!!!!!IT WORKS!!!!!!!');
    //return messageStorage.upload(key);

    messageStream.emit('new:uploadList', helper.stringifyPipeMessage(metaData, uploadPages));
    messageStream.emit('api:done', key);
    uploadPages = null;

};

var saveZipToDisk = function (uploadList, data) {
    var archiveStream = archiver.bulkArchive(uploadList);
    var result = {
        message: data.message,
        key: data.key || undefined,
        bucketName: data.bucketName
    };

    log('creating zip file for message', helper.getMeta(data.message));
    var zipPath = helper.getZipName({}, data.message, data.basePath);


    fsExtra.ensureDir(path.join(data.basePath, 'tmp'), function (err) {
        archiveStream
            .pipe(fs.createWriteStream(zipPath))
            .on('finish', function () {
                log('[!] saved to %s', zipPath);
                result.zipPath = zipPath;
                messageStream.emit('new:zip', result);
                messageStream.emit('api:done', data.key);
            });
    });
};
//process.send({ready: true});

console.log('CREATE PIPE');
messageStream
    .pipe(configStream)
    .pipe(apiStream)
    .pipe(loadLocale)
    .on('data', function (data) {
        var saveDiskPath = path.join(data.basePath, '..'),
            knox = config.main.knox,
            json;

        var generatePageTimeDiff = timeDiff.create('generate:page:' + data.message.page);


        knox.S3_BUCKET = data.bucketName;

        ydGetText.setLocale(data.message.locale);
        generator.init(knox, ydGetText, saveDiskPath);
        // generate json and html files

        json = _.map(data.apiCallResult, generator.generateJsonPage);




        async.mapLimit(data.apiCallResult, 50, function (config, next) {
            log('Processing page url: %s pagePath: %s', config.uploadUrl, config.pagePath);
            generator.generatePage(config, next);
        }, function (err, uploadPages) {
            if (err) {
                return  handleError(err.stack || err, data);
            }

            var jsonLength = json.length,
                htmlLength = uploadPages.length;


            //create list of files to upload
            // result.uploadList = html.concat(_.flatten(json, true));
            for (var i = 0; i < jsonLength; i++) {
                uploadPages = uploadPages.concat(json[i]);
            }
            json = [];

            log('upload list length %d', uploadPages.length);
            generatePageTimeDiff.stop();
            //if the amount is more then 200 create an archive write it to disk and
            //send to the worker the archive link

            if (htmlLength > 250) {
                return saveZipToDisk(uploadPages, data);
            }
            //if html files amount is less then 200 send them to the worker

            sendToWorker(data.message, data.key, data.bucketName, uploadPages);
            //
            //archiver.bulkArchive(uploadPages)
            //    .pipe(es.through(function () {
            //    }, function () {
            //        console.log('!!!!!IT WORKS!!!!!!!');
            //        return messageStorage.upload(data.key);
            //    }));
                //.pipe(sendToWorker(data.message, data.key, data.bucketName));

        });
    });

messageStream.on('message:uploaded', function (key) {
    log('deleting api cache for message with key %s', key);
    generator.deleteCachedCall(key);
});

module.exports = messageStream;


//process.on('uncaughtException', error.getErrorHandler(log, function (err) {
//    router.send('error', err);
//}));
//
//if (config.main.memwatch) {
//    var memwatch = require('memwatch');
//
//    memwatch.on('leak', function (info) {
//        log('warn', '[MEMORY:LEAK] %j', info, {memoryLeak: true});
//    });
//}

