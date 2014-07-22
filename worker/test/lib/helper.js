/*global describe, it, beforeEach, afterEach, before, after: true*/

'use strict';

var es = require('event-stream');
var expect = require('chai').expect;
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

    });


    describe('#streamFilter', function () {

        it('should filter in sync mode', function (done) {
            var correctMessage = {a: 1},
                incorrectMessage = {a: 2};

            var stream = helper.streamFilter(function (data) {
                return data.a === 1;
            });

            stream.on('data', function (data) {
                expect(data).to.eql(correctMessage);
                done();
            });

            stream.write(incorrectMessage);
            stream.end(correctMessage);
        });

        it('should filter in async mode', function (done) {
            var correctMessage = {a: 1},
                incorrectMessage = {a: 2};

            var filter = helper.streamFilter(function (data, next) {
                return process.nextTick(function () {
                    next(null, data.a === 1);
                });
            });

            es.readArray([incorrectMessage, correctMessage])
                .pipe(filter)
                .pipe(es.writeArray(function (err, res) {
                    expect(err).to.eql(null);
                    expect(res).to.have.length(1);
                    expect(res[0]).to.eql(correctMessage);
                    done();
                }));
        });

    });
});
