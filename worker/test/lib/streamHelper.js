/*global describe, it, beforeEach, afterEach, before, after: true*/

'use strict';

var es = require('event-stream');
var expect = require('chai').expect;
var helper = require('../../lib/streamHelper');


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

});
