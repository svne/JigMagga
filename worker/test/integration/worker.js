/*global describe, it, afterEach, before: true*/

'use strict';
var path = require('path'),
    cheerio = require('cheerio'),
    format = require('util').format,
    _ = require('lodash'),
    async = require('async'),
    configMerge = require('jmUtil').configMerge,
    spawn = require('child_process').spawn,
    request = require('request'),
    expect = require('chai').expect,
    assert = require('chai').assert;

var amqp = require('../../lib/amqp'),
    config = require('../../config'),
    message = require('../../testData/message'),
    service = require('../../testData/servicePage'),
    menu = require('../../testData/menuPage'),
    index = require('../../testData/indexPage');

var processes = [];

var basePath = process.env.NODE_PROJECT_BASE_PATH || path.join(__dirname, '../../../yd/page');

var namespace = process.env.NODE_PROJECT_NAME;
if (!namespace) {
    throw new Error('you have to set environment variable NODE_PROJECT_NAME');
}

process.on('exit', function () {
    processes.forEach(function (pr) {
        if (pr && _.isFunction(pr.kill)) {
            pr.kill();
        }
        pr = null;
    });
});

describe('worker', function () {
    var command = './worker/index.js';

    describe('initialization', function () {
        var args = ['-n', namespace, '-q', '-H'];

        it('should start generator subprocess', function (done) {
            var correctMessageRegExp = new RegExp('^started.*', 'i');
            var ownChild = spawn(command, args);
            processes.push(ownChild);
            var timeout = setTimeout(function () {
                done('process did not start in time');
            }, 16000);

            ownChild.stdout.on('data', function (data) {
                try{
                    data = JSON.parse(data.toString());
                    // console.log(data);
                } catch (e) {
                    console.log(data.toString());
                }

                if (correctMessageRegExp.test(data.message) && data.component === 'generator' ) {
                    clearTimeout(timeout);
                    done();
                }
            });

            ownChild.stderr.on('data', function (data) {
                console.log('error', data);
                done(data);
            });
        });

        it('should start queue stream with correct name', function (done) {
            var correctMessageRegExp = new RegExp('pages.generate.high .* ready$', 'i');
            var ownChild = spawn(command, args);
            processes.push(ownChild);
            var timeout = setTimeout(function () {
                done('process did not start in time');
            }, 6000);

            ownChild.stdout.on('data', function (data) {
                data = JSON.parse(data.toString());

                if (correctMessageRegExp.test(data.message)) {
                    clearTimeout(timeout);
                    expect(data.component).to.eql('worker');
                    expect(data.processId).to.be.a('number');
                    done();
                }
            });

            ownChild.stderr.on('data', function (data) {
                done(data);
            });
        });

        it('should start uploader subprocess', function (done) {
            var correctMessageRegExp = new RegExp('^started', 'ig');
            var child = spawn(command, args);
            processes.push(child);
            var timeout = setTimeout(function () {
                done('process did not start in time');
            }, 6000);

            child.stdout.on('data', function (data) {
                data = JSON.parse(data.toString());

                if (correctMessageRegExp.test(data.message) && data.component === 'uploader') {
                    clearTimeout(timeout);
                    expect(data.processId).to.be.a('string');
                    done();
                }
            });

            child.stderr.on('data', function (data) {
                done(data);
            });
        });
    });

    describe('page generation and uploading', function () {
        var args = ['-n', namespace, '-q', '-H', '-d', 'lieferando.de'];

        var queues = {
            amqpQueue: 'pages.generate.lieferando.de.high'
        };
        var connection = amqp.getConnection(config.amqp);
        var queuePool = new amqp.QueuePool(queues, connection);

        var uploadedMessageRegExp = new RegExp('^message uploaded', 'ig');
        var workerProcess;

        before(function () {
            workerProcess = spawn(command, args);
            processes.push(workerProcess);
        });

        it('should upload message', function (done) {
            var startedMessageRegExp = new RegExp('pages.generate.lieferando.de.high .* ready$', 'i');
            var uploadedMessageRegExp = new RegExp('^message uploaded', 'i');

            var timeout = setTimeout(function () {
                done('process did not upload in time');
            }, 30000);

            workerProcess.stdout.on('data', function (data) {
                try{
                    data = JSON.parse(data.toString());
                } catch (e) {}

                if (startedMessageRegExp.test(data.message) && data.component === 'worker' ) {
                    queuePool.amqpQueue.publish(JSON.stringify(message));
                }

                if (data.component === 'worker' && uploadedMessageRegExp.test(data.message)) {
                    workerProcess.stdout.removeAllListeners('data');
                    workerProcess.stderr.removeAllListeners('data');

                    clearTimeout(timeout);
                    done();
                }
            });

            workerProcess.stderr.on('data', function (data) {
                console.log('error', data.toString());
                done(data);
            });
        });

        /**
         *
         * @param {string} message
         */
        var getBucketName = function (message) {
            var extractBucketRegExp = new RegExp('to:\\s([^\\/]+)', 'i');
            var regExpResult = message.match(extractBucketRegExp);
            if (!regExpResult || !_.isArray(regExpResult) || !regExpResult[1]) {
                return null;
            }

            return regExpResult[1];
        };

        var getPage = function (bucket, link, done) {


            var url = format('http://%s/%s', bucket, link);
            var headers = {
                'Cache-Control': 'no-cache,no-store,must-revalidate,max-age=0'
            };
            var qs = {date: Date.now()};
            request.get(url, {headers: headers, qs: qs}, function (err, response, body) {
                if (err) {
                    console.log(err);
                    return done(err);
                }
                done(null, response, body);
            });
        };

        var checkHTML = function (message, body, callback) {
            configMerge.getPageConfig(basePath, message.basedomain, message.page, function (err, pageConfig) {
                if (err) {
                    return callback(err);
                }

                var jigs = pageConfig.jigs;
                var prerenderedJigs = Object.keys(jigs)
                    .filter(function (name) {
                        return ((jigs[name].prerender === undefined ||
                                jigs[name].prerender === true) && !jigs[name].disabled);
                    })
                    .map(function (name) {
                       var jig = jigs[name];
                       jig.className = name;
                       return jig;
                    });
                var $ = cheerio.load(body);

                _.each(prerenderedJigs, function (jig) {
                    var elements = $(jig.className);
                    assert(elements.length >= 1, 'no section for jig' +  jig.className);

                    var children = $(jig.className).children();
                    if (!children.length) {
                        console.log('[!!!] no children in section', jig.className);
                    }
                });
                callback();
            });
        };

        var uploadAndValidate = function (worker, msg, url, callback) {
            if (typeof url === 'function') {
                callback = url;
                url = msg.url;
            }

            var timeout = setTimeout(function () {
                callback('process did not upload the message in time');
            }, 30000);


            var bucketName = null;

            worker.stdout.on('data', function (data) {
                try{
                    data = JSON.parse(data.toString());
                } catch (e) {}

                if (data.component === 'uploader' && data.level === 'success') {
                    bucketName = getBucketName(data.message);
                }
                if (data.component === 'worker' && uploadedMessageRegExp.test(data.message)) {
                    clearTimeout(timeout);
                    worker.stdout.removeAllListeners('data');
                    worker.stderr.removeAllListeners('data');

                    async.waterfall([
                        getPage.bind(null, bucketName, url),
                        function (response, body, next) {
                            expect(response.statusCode).to.eql(200);

                            var lastModified = new Date(response.headers["'last-modified'"]);
                            var timeDelta = Date.now() - lastModified.valueOf();

                            expect(timeDelta).to.be.not.above(1 * 60 * 1000);

                            checkHTML(msg, body, next);
                        }
                    ], callback);

                }
            });

            worker.stderr.on('data', function (data) {
                console.log('ERROR', data.toString());
                callback(data);
            });

            queuePool.amqpQueue.publish(JSON.stringify(msg));

        };

        it('should upload correct html for menu page', function (done) {
            uploadAndValidate(workerProcess, menu, done);
        });

        it('should upload correct html for service page', function (done) {
            uploadAndValidate(workerProcess, service, 'essen-bestellen-' + service.url, done);
        });

        it('should upload correct html for index page', function (done) {
            uploadAndValidate(workerProcess, index, done);
        });

        it('should upload page and check additions', function (done) {
            var args = ['-n', 'yd', '-d', 'lieferando.de', '-p', 'menu', '-u', 'burger-dream-berlin', '-r', '12291'];
            var workerProcess = spawn(command, args);
            processes.push(workerProcess);

            var timeout = setTimeout(function () {
                done('process did not upload the message in time');
            }, 30000);

            workerProcess.stdout.on('data', function (data) {
                console.log(data.toString());

                try {
                    data = JSON.parse(data.toString());
                } catch (e) {}
                if (data.component === 'worker' && uploadedMessageRegExp.test(data.message)) {
                    clearTimeout(timeout);
                    done(null);
                }
            });

            workerProcess.stdout.on('error', function (data) {
                clearTimeout(timeout);
                done(data);
            });
        });
    });
});
