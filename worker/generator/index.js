'use strict';

/**
 * Generator module. Obtains new message from worker,
 * Call api, generate JSON and HTML files
 */

var EventEmitter = require('events').EventEmitter,
    fs = require('fs'),
    _ = require('lodash'),
    path = require('path'),
    es = require('event-stream');

var log = require('../lib/logger')('generator', {component: 'generator', processId: process.pid}),
    archiver = require('../lib/archiver'),
    helper = require('../lib/helper'),
    stream = require('../lib/streamHelper'),
    ydGetText = require('jmUtil').ydGettext,
    generateConfig = require('./lib/generateConfig'),
    generator = require('./lib/generator'),
    ProcessRouter = require('../lib/router');

//init process router
var router = new ProcessRouter(process);
log('started, pid', process.pid);

if (process.env.NODE_ENV === 'local') {
    var memwatch = require('memwatch');
}

var config = require('../config');

var messageStream = stream.duplex();

router.addRoutes({
    /**
     * write to message stream the message that comes from generator
     * @param  {Object} data
     */
    'new:message': function (data) {
        messageStream.write(data);
    }
});


/**
 * merge all configs and create viewContainer
 * @param  {object}   data [data from worker]
 * @param  {Function} next
 * @return {stream}
 */
var configStream = es.map(function (data, next) {
    generateConfig(data, config, next);
});

var emitter = new EventEmitter();
emitter.on('call:parsing', function (name, config) {
    log('Parsing call for jig %s config: %j', name, config, {api:true});
});
emitter.on('call:success', function (requestId) {
    log('Api call success for %s', requestId, {api: true});
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
var apiStream = es.map(function (data, next) {
    log('[*] send api request', helper.getMeta(data.message));
    generator.apiCalls([data.config], emitter, function (err, res) {
        if (err) {
            return log('error', 'error in apiCall %j %j ', err, res, {error: true});
            // return next(err);
        }
        data.apiCallResult = res;
        return next(null, data);
    });
});

var lastLocale = '';
/**
 * loads locale file for each message if the file for that locale was not 
 * loaded before
 * 
 * @param  {object}   data
 * @param  {Function} callback
 */
var loadLocale = es.map(function (data, callback) {
    var domain = data.message.domain,
        locale = data.message.locale;
    if (lastLocale === domain + locale) {
        return callback(null, data);
    }
    ydGetText.locale(data.basePath, domain, locale, function () {
        lastLocale = domain + locale;
        callback(null, data);
    });

});

messageStream
    .pipe(configStream)
    .pipe(apiStream)
    .pipe(loadLocale)
    .pipe(es.through(function (data) {
        var that = this,
            saveDiskPath = path.join(data.basePath, '..'),
            knox = config.main.knox;

        knox.S3_BUCKET = knox.S3_BUCKET || data.bucketName;

        ydGetText.setLocale(data.message.locale);
        generator.init(knox, ydGetText, saveDiskPath);

        // generate json and html files
        var json = _.map(data.apiCallResult, generator.generateJsonPage); 
        var html = _.map(data.apiCallResult, function (config) {
                log('Processing page url: %s pagePath: %s', config.uploadUrl, config.pagePath);
                return generator.generatePage(config);
            });

        var result = {
            message: data.message,
            key: data.key || undefined
        };

        //create list of files to upload
        result.uploadList = html.concat(_.flatten(json, true));

        log('upload list length %d', result.uploadList.length);
        
        //if html files amount is less then 200 send them to the worker 
        if (html.length < 200) {
            that.emit('data', '');
            router.send('pipe', result);
            return;
        }

        //if the amount is more then 200 create an archive write it to disck and
        //send to the worker the archive link
        var archiveStream = archiver.bulkArchive(result.uploadList);

        log('creating zip file for message', helper.getMeta(data.message));
        var zipPath = helper.getZipName({}, data.message, data.basePath);
        archiveStream
            .pipe(fs.createWriteStream(zipPath))
            .on('finish', function () {
                log('[!] saved to %s', zipPath);
                delete result.uploadList;
                result.zipPath = zipPath;
                router.send('new:zip', result);
            });
    }));

process.send({ready: true});

process.on('uncaughtException', function (err) {
    var stack = err.err ? err.err.stack : err.stack;
    log('error', '%s %j', err, stack, {uncaughtException: true});
    process.kill();
});

if (process.env.NODE_ENV === 'local') {
    memwatch.on('leak', function (info) {
        log('warn', '[MEMORY:LEAK] %j', info, {memoryLeak: true});
    });
}