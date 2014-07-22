/*global describe, it, beforeEach, before, after: true*/

'use strict';

var expect = require('chai').expect;

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
        before(function () {
            child = createSubProcess(__dirname + '/../../testData/pipeTestProcess.js');
            router = new ProcessRouter(child);
        });

        after(function () {
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
    });
});