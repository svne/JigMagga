'use strict';

var _ = require('lodash'),
    path = require('path'),
    clc = require('cli-color'),
    es = require('event-stream');

var stream = require('../lib/streamHelper'),
    ydGetText = require('jmUtil').ydGettext,
    generateConfig = require('./lib/generateConfig'),
    generator = require('./lib/generator'),
    ProcessRouter = require('../lib/router');

var router = new ProcessRouter(process);

var config = require('../config');

var messageStream = stream.duplex();

router.addRoutes({
    'new:message': function (data) {
        messageStream.write(data);
    }
});

var lastLocale = '';

var useLocale = function () {
    return es.map(function (data, callback) {
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
            ydGetText.locale(data.basePath, domain, locale, function () {
                lastLocale = domain + locale;
                next();
            });
        } else {
            next();
        }
    });
};


messageStream
    .pipe(useLocale())
    .pipe(es.map(function (data, callback) {
        var saveDiskPath = path.join(data.basePath, '..'),
            knox = config.main.knox;

        knox.S3_BUCKET = knox.S3_BUCKET || data.bucketName;

        generator.init(knox, ydGetText, saveDiskPath);

        generateConfig(data, config, callback);
    }))
    .pipe(es.map(function (data, callback) {
        generator.apiCalls([data.config], function (err, res) {
            if (err) {

                return callback(err);
            }
            data.config = res;
            callback(null, data);
        });
    }))
    .on('error', function (err) {
        console.log('Error in apiCall', err, err.err);
    })
    .on('data', function (data) {
        var result = {
            json: _.map(data.config, generator.generateJsonPage),
            html: _.map(data.config, generator.generatePage),
            message: data.message
        };

        router.send('pipe', result);
        result = null;
    });

process.send({ready: true});

process.on('uncaughtException', function (err) {
    console.log(clc.red('[ERROR IN GENERATOR]'));
    console.log(clc.red(err));
    console.log(clc.red(err.stack));
    process.kill();
});