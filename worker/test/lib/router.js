/*global describe, it, beforeEach, before, after: true*/

'use strict';

var expect = require('chai').expect;
var fs = require('fs');

var ProcessRouter = require('../../lib/router');
var createSubProcess = require('../../lib/helper').createSubProcess;

describe('ProcessRouter', function () {
    describe('ipc communication', function () {
        var router,
            child;
        before(function () {
            child = createSubProcess(__dirname + '/../../testData/simpleProcess.js');
            router = new ProcessRouter(child);
        });

        after(function () {
            child.kill();
        });

        it('should send message to route and obtain it', function (done) {
            var command = 'foo',
                message = {'foo': 'bar'};

            router.addRoutes({
                foo: function (data) {
                    expect(data).to.eql(message);
                    done();
                }
            });

            router.send(command, message);
        });

    });

    describe('pipe communication', function () {
        var router,
            child;
        beforeEach(function () {
            child = createSubProcess(__dirname + '/../../testData/pipeTestProcess.js');
            router = new ProcessRouter(child);
        });

        afterEach(function () {
            child.kill();
        });

        it('should send message to pipe and obtain it back', function (done) {
            var message = 'foo bar';

            router.pipe.on('data', function (msg) {
                expect(msg.toString()).to.eql(message);
                done();
            });

            router.pipe.write(message);
        });

        it('should send two big messages to pipe and obtain it back', function (done) {
            var child = createSubProcess(__dirname + '/../../testData/pipeRouters.js'),
                router = new ProcessRouter(child),
                message1 = fs.readFileSync(__dirname + '/../../testData/bigFile').toString(),
                message2 =  fs.readFileSync(__dirname + '/../../testData/bigFile2').toString(),
                messagesCount = 0,
                first,
                second;

            router.addRoutes({
                pipe: function (data) {
                    messagesCount += 1;

                    if (messagesCount === 1) {
                        first = data;
                    } else if (messagesCount === 2) {
                        second = data;

                        expect(first.replace('���', '€')).to.eql(message1);
                        expect(second.replace('���', '€')).to.eql(message2);
                        done();
                    }
                }
            });

            router.send('pipe', message1);
            router.send('pipe', message2);
        });
    });
});