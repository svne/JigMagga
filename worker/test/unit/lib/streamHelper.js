/*global describe, it, beforeEach, afterEach, before, after: true*/

'use strict';

var es = require('event-stream');
var expect = require('chai').expect;
var helper = require('../../../lib/streamHelper');


describe('streamHelper', function () {
    describe('#filter', function () {

        it('should filter in sync mode', function (done) {
            var stream,
                correctMessage = {a: 1},
                incorrectMessage = {a: 2};

            stream = helper.filter(function (data) {
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
            var filter,
                correctMessage = {a: 1},
                incorrectMessage = {a: 2};

            filter = helper.filter(function (data, next) {
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

    describe('#accumulate', function () {
        it('should collect all messages in a buffer and emit one accumulated message', function (done) {
            var messages = ['Hello ', 'World'];
            var accumulater = helper.accumulate(function (err, message) {
                expect(message.toString()).to.eql(messages.join(''));
                done();
            });

            es.readArray(messages).pipe(accumulater);
        });
    });

    describe('#tryCatch', function () {
        it('should add listener to error event of streams and create a handler for all such events', function (done) {
            var tc = helper.tryCatch();

            var errorStream = tc(es.through(function () {
                this.emit('error', 'foo');
            }));

            var source = tc(es.readArray(['bar', 'foo']));

            tc.catch(function (err) {
                expect(err).to.eql('foo');
                done();
            });

            source.pipe(errorStream);
        });
    });

});
