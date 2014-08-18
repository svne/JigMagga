/*global describe, it, beforeEach, before, after, afterEach: true*/

'use strict';

var expect = require('chai').expect;
var rewire = require('rewire');
var sinon = require('sinon');
var helper = require('../../lib/helper');

var konphyg = require('konphyg')(__dirname + '/../../config');

var baseConfig = konphyg.all();

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
    });



    describe('#createSubProcess', function () {
        var child;
        before(function () {
            child = helper.createSubProcess(__dirname + '/../../testData/simpleProcess.js');
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
            helper.createSubProcess(__dirname + '/../../testData/asyncProcess.js', function (err, child) {
                expect(err).to.eql(null);
                expect(child.send).to.be.a('function');
                expect(child.on).to.be.a('function');
                child.kill();
                done();
            });
        });

        it.skip('should send an error if process will not send a message in 5000 msec', function (done) {
            var clock = sinon.useFakeTimers();
            helper.createSubProcess(__dirname + '/../../testData/asyncProcess.js', function (err) {
                expect(err).to.be.a('string');
                expect(err).to.eql('child process did not send a ready message');
                clock.restore();
                done();
            });
            clock.tick(5100);

        });
    });
    
    describe('getFolderFiles', function () {
        var folderPath = __dirname + '/../../testData';
        it('should returns all files from test data folder', function (done) {

            helper.getFolderFiles(folderPath, function (err, res) {
                expect(err).to.eql(null);
                expect(res).to.have.length(10);
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
        var helper = rewire('../../lib/helper');
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
});
