/*global describe, it, beforeEach, before, after, afterEach: true*/

'use strict';

var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var rewire = require('rewire');
var sinon = require('sinon');
var helper = require('../../../lib/helper');


var baseConfig = {
    amqp : {
        "prefixes": {
            "highprio": ".high",
            "mediumprio": ".medium",
            "lowprio": ".low",
            "default": ".deploy"
        },
        "queueBaseName": "pages.generate",
        "queueErrorBaseName": "pages.generate.error"
    }
};

describe('helper', function () {


    describe('#getQueNames', function () {
        var config;

        beforeEach(function () {
            config = {
                basedomain: 'foo'
            };
        });

        it('should provide correct names if priority is high', function () {
            config.highprio = true;

            var high = helper.getQueNames(config, baseConfig.amqp);
            expect(high.amqpQueue).to.be.eql('pages.generate.foo.high');
            expect(high.amqpErrorQueue).to.be.eql('pages.generate.foo.error.high');
        });

        it('should provide correct names if priority is medium', function () {
            config.mediumprio = true;

            var medium = helper.getQueNames(config, baseConfig.amqp);
            expect(medium.amqpQueue).to.be.eql('pages.generate.foo.medium');
            expect(medium.amqpErrorQueue).to.be.eql('pages.generate.foo.error.medium');
        });

        it('should provide correct names if priority is low', function () {
            config.lowprio = true;

            var low = helper.getQueNames(config, baseConfig.amqp);
            expect(low.amqpQueue).to.be.eql('pages.generate.foo.low');
            expect(low.amqpErrorQueue).to.be.eql('pages.generate.foo.error.low');
        });

        it('should provide correct names if the priority is not set', function () {
            var deploy = helper.getQueNames(config, baseConfig.amqp);
            expect(deploy.amqpQueue).to.be.eql('pages.generate.foo.deploy');
            expect(deploy.amqpErrorQueue).to.be.eql('pages.generate.foo.error.deploy');
        });

        it('should provide correct names with postfix if it set', function () {
            config.postfix = 'bar';
            var deploy = helper.getQueNames(config, baseConfig.amqp);
            expect(deploy.amqpQueue).to.be.eql('pages.generate.foo.deploy.bar');
            expect(deploy.amqpErrorQueue).to.be.eql('pages.generate.foo.error.deploy');
        });

        it('should provide correct names errorqueue is true', function () {
            config.errorqueue = true;
            config.highprio = true;
            delete config.basedomain;

            var deploy = helper.getQueNames(config, baseConfig.amqp);
            expect(deploy.amqpQueue).to.be.eql('pages.generate.error.high');
            expect(deploy.amqpErrorQueue).to.be.eql('pages.generate.error.error.high');
        });
    });



    describe('#createSubProcess', function () {
        var child;
        before(function () {
            child = helper.createSubProcess(__dirname + '/../../../testData/simpleProcess.js');
        });

        after(function () {
            child.kill();
        });

        it('should create a process with ipc', function (done) {
            expect(child.send).to.be.a('function');
            expect(child.on).to.be.a('function');
            var message = {msg: 'message'};
            child.on('message', function (data) {
                expect(data).to.eql(message);
                done();
            });

            child.send(message);
        });

        it('should create a process with pipe', function () {
            expect(child.stdio[3]).to.be.an('object');
            expect(child.stdio[3].on).to.be.a('function');
        });

        it('should create a process in async way', function (done) {
            helper.createSubProcess(__dirname + '/../../../testData/asyncProcess.js', function (err, child) {
                expect(err).to.eql(null);
                expect(child.send).to.be.a('function');
                expect(child.on).to.be.a('function');
                child.kill();
                done();
            });
        });
        describe('timer', function () {
            var clock;
            before(function () {
                clock = sinon.useFakeTimers();
            });      
            it('should send an error if process will not send a message in 15000 msec', function (done) {
                helper.createSubProcess(__dirname + '/../../../testData/asyncProcess.js', function (err) {
                    expect(err).to.be.a('string');
                    expect(err).to.contain('child process did not send a ready message');
                    done();
                });
                clock.tick(20000);
            });
            after(function () {
                clock.restore();
            });
        });
    });
    
    describe('getFolderFiles', function () {
        var folderPath = __dirname + '/../../../testData';
        it('should returns all files from test data folder', function (done) {
            var files = fs.readdirSync(folderPath);

            helper.getFolderFiles(folderPath, function (err, res) {
                expect(err).to.eql(null);
                expect(res).to.have.length(files.length);
                expect(res[0]).to.include.keys('path', 'name');
                done();
            });
        });

        it('should return anly files with js extension', function (done) {
            helper.getFolderFiles(folderPath, function (file) {
                return /\.js$/ig.test(file.name);
            }, function (err, res) {
               expect(err).to.eql(null);
               expect(res).to.have.length(4);
               expect(res[0]).to.include.keys('path', 'name');
               done();
            }); 
        });

        it('should return error if folderPath uncorrect', function (done) {
            helper.getFolderFiles('/das/sdasd', function (err, res) {
                expect(err).to.eql(null);
                expect(res).to.have.length(0);
                done();
            });
        });
    });

    describe('messageAckStorage', function () {
        var helper = rewire('../../../lib/helper');
        afterEach(function () {
            helper.__set__('messageAckStorage', {});
        });

        describe('#setAckToStorage', function () {
            it('should increase count if it has the same key in storage', function () {
                var data = {
                    queueShift: function () {},
                    key: 'foo'
                };
                helper.setAckToStorage(data);
                helper.setAckToStorage(data);
                var messageAckStorage = helper.__get__('messageAckStorage');
                expect(messageAckStorage[data.key]).to.be.an('object');

                expect(messageAckStorage[data.key].count).to.eql(2);
            });            
        });

        describe('#executeAck', function () {
            it('should reduce the count and do not execute queueShift (ack) function if it more then 1', function () {
                var data = {
                    queueShift: sinon.spy(),
                    key: 'foo'
                };
                helper.setAckToStorage(data);
                helper.setAckToStorage(data);
                helper.setAckToStorage(data);
                helper.executeAck(data.key);

                var messageAckStorage = helper.__get__('messageAckStorage');
                expect(messageAckStorage[data.key]).to.be.an('object');

                expect(messageAckStorage[data.key].count).to.eql(2);
                expect(messageAckStorage[data.key].queueShift.called).to.not.eql(true);
            });

            it('should reduce the count and execute function if it count  eql 1', function () {
                var data = {
                    queueShift: sinon.spy(),
                    key: 'foo'
                };
                helper.setAckToStorage(data);
                helper.setAckToStorage(data);
                helper.executeAck(data.key);
                helper.executeAck(data.key);

                var messageAckStorage = helper.__get__('messageAckStorage');
                expect(messageAckStorage[data.key]).to.eql(undefined);

                expect(data.queueShift.calledOnce).to.eql(true);
            });
        });
    });
    
    var message = require('../../../testData/message.json'); 

    describe('#getZipName', function () {
        var basePath = '/foo/bar/';

        it('should create correct zip name', function () {
            var name = helper.getZipName({}, message, basePath);
            expect(name).to.contain(basePath, message.page, message.url, message.locale);
        });

        it('should include relative path to zip name if it is in write option', function () {
            var relative = './relative/path';
            var name = helper.getZipName({write: relative}, message, basePath);
            var pathToZip = path.join(process.cwd(), relative);
            expect(name).to.contain(pathToZip, message.page, message.url, message.locale);
        });
    });

    describe('#generateBucketName', function () {
        it('should produce correct bucket name if the basedomain is in config', function () {
            var data = {
                message: message
            };
            var name = helper.generateBucketName(data, {live: true});
            expect(name).to.eql('www.lieferservice.de');

            name = helper.generateBucketName(data, {});
            expect(name).to.eql('stage.lieferservice.de');
        });

        it('should produce correct bucket name if the basedomain is not in config', function () {

            var data = {
                message: {basedomain: 'google.com'}
            };
            var name = helper.generateBucketName(data, {live: true});
            expect(name).to.eql('www.google.com');

            name = helper.generateBucketName(data, {});
            expect(name).to.eql('stage.google.com');
        });
    });
    describe('#isMessageFormatCorrect', function () {
        it('should return false if there is no basedomain in message or it is in the skip list', function () {
            var result = helper.isMessageFormatCorrect({page:'foo', url:'foo'});
            expect(result).to.eql(false);

            result = helper.isMessageFormatCorrect({page:'foo', url:'foo', basedomain: 'lieferando.at'});
            expect(result).to.eql(false);
        });
        it('should return false if there is only url or only page in the message', function () {
            var result = helper.isMessageFormatCorrect({page:'foo', basedomain:'foo'});
            expect(result).to.eql(false);

            result = helper.isMessageFormatCorrect({url:'foo', basedomain: 'foo'});
            expect(result).to.eql(false);
        });
        it('should return true if there is niether url nor page in the message or there are both of them', function () {
            var result = helper.isMessageFormatCorrect({basedomain:'foo'});
            expect(result).to.eql(true);

            result = helper.isMessageFormatCorrect({url:'foo', page:'foo', basedomain: 'foo'});
            expect(result).to.eql(true);
        });
    });
});
