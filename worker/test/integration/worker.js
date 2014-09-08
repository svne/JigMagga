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

process.on('exit', function () {
    processes.forEach(function (pr) {
        pr.kill();
        pr = null;
    });
});

describe('worker', function () {
    var command = './worker/index.js';

    describe('initialization', function () {
        var args = ['-t', './yd', '-q', '-H'];

        it('should start generator subprocess', function (done) {
            var correctMessageRegExp = new RegExp('^started', 'ig');
            var ownChild = spawn(command, args);
            processes.push(ownChild);
            var timeout = setTimeout(function () {
                done('process did not start in time');
            }, 6000);

            ownChild.stdout.on('data', function (data) {
                try{
                    data = JSON.parse(data.toString());
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
            var correctMessageRegExp = new RegExp('pages.generate.high .* ready$', 'ig');
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
                    expect(data.processId).to.be.a('string');
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

        it('should start redis in worker and uploader', function (done) {
            var correctMessageRegExp = new RegExp('^redis .* ready', 'ig');
            var child = spawn(command, args);
            processes.push(child);
            var timeout = setTimeout(function () {
                done('process did not start in time');
            }, 6000);
            var correctMessageBuffer = [];
            child.stdout.on('data', function (data) {
                data = JSON.parse(data.toString());

                if (correctMessageRegExp.test(data.message)) {
                    correctMessageBuffer.push(data);
                    if (correctMessageBuffer.length === 2) {
                        clearTimeout(timeout);
                        var isUploader = _.find(correctMessageBuffer, {component: 'uploader'});
                        var isWorker = _.find(correctMessageBuffer, {component: 'worker'});

                        expect(isUploader).to.not.eql(undefined);
                        expect(isWorker).to.not.eql(undefined);
                        expect(data.processId).to.be.a('string');
                        done();
                    }
                }
            });

            child.stderr.on('data', function (data) {
                done(data);
            });
        });

    });

    describe('page generation and uploading', function () {
        var args = ['-t', './yd', '-q', '-H', '-d', 'lieferando.de'];

        var queues = {
            amqpQueue: 'pages.generate.lieferando.de.high'
        };
        var connection = amqp.getConnection(config.amqp.credentials);
        var queuePool = new amqp.QueuePool(queues, connection);

        var workerProcess;

        before(function () {
            workerProcess = spawn(command, args);
            processes.push(workerProcess);
        });

        // afterEach(function () {
        //     workerProcess.stdout.removeAllListeners('data');
        //     workerProcess.stderr.removeAllListeners('data');
        // });

        it('should upload message', function (done) {
            var startedMessageRegExp = new RegExp('pages.generate.lieferando.de.high .* ready$', 'ig');
            var uploadedMessageRegExp = new RegExp('^message uploaded', 'ig');

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

        var getPage = function (link, done) {
            var url = format('http://%s/%s', config.main.knox.S3_BUCKET, link);
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

            var uploadedMessageRegExp = new RegExp('^message uploaded', 'ig');

            var timeout = setTimeout(function () {
                callback('process did not upload the message in time');
            }, 30000);


            worker.stdout.on('data', function (data) {
                try{
                    data = JSON.parse(data.toString());
                } catch (e) {}

                if (data.component === 'worker' && uploadedMessageRegExp.test(data.message)) {
                    clearTimeout(timeout);
                    worker.stdout.removeAllListeners('data');
                    worker.stderr.removeAllListeners('data');

                    async.waterfall([
                        getPage.bind(null, url),
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
    });
});