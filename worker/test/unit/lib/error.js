/*global describe, it, before, after: true*/

'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');

var error = require('../../../lib/error');

var WorkerError = error.WorkerError;

describe('error', function () {
    describe('#getErrorHandler', function () {
        var _kill;
        before(function () {
            _kill = process.kill;
            process.kill = sinon.spy();
        });
        after(function () {
            process.kill = _kill;
        });

        var errorMessage = 'foo bar';
        var originalMessage = {foo: 'bar'};

        it('should execute callback if the error is instance of WorkerError', function () {
            var handler = error.getErrorHandler(function (){}, function (err) {
                expect(err).to.be.an.instanceOf(WorkerError);
                expect(err.originalMessage).to.eql(originalMessage);
            });

            handler(new WorkerError(errorMessage, originalMessage));
            expect(process.kill.called).to.eql(false);
        });

        it('should log error and kill the process in the case of uncaught error', function (done) {

            var callback = sinon.spy(),
                log = sinon.spy();

            var handler = error.getErrorHandler(log, callback);
            handler(new Error(errorMessage));
            expect(log.called).to.eql(true);
            expect(callback.called).to.eql(false);

            setTimeout(function () {
                expect(process.kill.called).to.eql(true);
                done();
            }, 200);    // process.kill command will be executed after 100ms delay

        });
    });
});
