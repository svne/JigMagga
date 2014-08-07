'use strict';

var EventEmitter = require('events').EventEmitter,
    _ = require('lodash'),
    async = require('async'),
    path = require('path'),
    es = require('event-stream');

var log = require('../lib/logger')('generator', {component: 'generator', processId: String(process.pid)}),
    stream = require('../lib/streamHelper'),
    ydGetText = require('jmUtil').ydGettext,
    generateConfig = require('./lib/generateConfig'),
    generator = require('./lib/generator'),
    ProcessRouter = require('../lib/router');

var router = new ProcessRouter(process);
log('started, pid', process.pid);

if (process.env.NODE_ENV === 'local') {
    var memwatch = require('memwatch');
}

var config = require('../config');

var messageStream = stream.duplex();
var ps = es.pause();
router.addRoutes({
    'new:message': function (data) {
        messageStream.write(data);
    }
});

var lastLocale = '';

var useLocale = function (data, callback) {
    var domain = data.message.domain,
        locale = data.message.locale,
        result = _.cloneDeep(data),
        mainLocale = data.config['init-locale'] || data.config.locales[0];

    function next() {
        result.locale = locale;
        result.isMainLocale = locale === mainLocale;
        callback(null, result);
    }

    if (lastLocale !== domain + locale) {
        log('locale obtained %s', domain + locale);
        ydGetText.locale(data.basePath, domain, locale, function () {
            lastLocale = domain + locale;
            next();
        });
    } else {
        next();
    }
};


messageStream
    .pipe(ps)
    .pipe(es.through(function (data, callback) {
        var that = this,
            saveDiskPath = path.join(data.basePath, '..'),
            knox = config.main.knox;

        knox.S3_BUCKET = knox.S3_BUCKET || data.bucketName;

        generator.init(knox, ydGetText, saveDiskPath);
        ps.pause();
        var emitter = new EventEmitter();
        async.waterfall([
            function (next) {
                useLocale(data, next);
            },
            function (data, next) {
                generateConfig(data, config, next);
            },
            function (data, next) {
                emitter.on('call:parsing', function (name, config) {
                    log('Parsing call for jig %s config: %j', name, config, {api:true});
                });
                emitter.on('call:success', function (requestId) {
                    log('Api call success for %s', requestId, {api: true});
                });

                emitter.on('config:ready', function (readyConfigsLength, configsLength, url) {
                    log('Config %d of %d for %s', readyConfigsLength, configsLength, url, {api: true});
                });

                generator.apiCalls([data.config], emitter, next);
            }
        ], function (err, res) {
            if (err) {
                log('error', 'apiCall %j %s', err, err.stack, {});
                return callback(err);
            }

            var result = {
                json: _.map(res, generator.generateJsonPage),
                html: _.map(res, function (config) {
                    log('Processing page url: %s pagePath: %s', config.uploadUrl, config.pagePath);
                    return generator.generatePage(config);
                }),
                message: data.message
            };
            log('!!content generated', {page: data.message.page, url: data.message.url, locale: data.message.locale});

            ps.resume();
            that.emit('data', '');
            router.send('pipe', result);
            result = null;
            emitter.removeAllListeners(['call:parsing', 'call:success', 'config:ready']);
        });

    }));

process.send({ready: true});

process.on('uncaughtException', function (err) {
    console.log(err, err.stack);
    log('error', '%s %j', err, err.stack, {uncaughtException: true});
    process.kill();
});

if (process.env.NODE_ENV === 'local') {
    memwatch.on('leak', function (info) {
        log('warn', '[MEMORY:LEAK] %j', info, {memoryLeak: true});
    });
}