/*global describe, it, before: true*/
'use strict';

var path = require('path');
var rewire = require('rewire');
var streamHelper = require('../../../lib/streamHelper');
var expect = require('chai').expect;
var sinon = require('sinon');

var messageSource = rewire('../../../lib/messageSource');

var message = require('../../../testData/message.json');

describe('messageSource', function () {
    var log = function  () {};

    describe('#getStaticOldSource', function () {
        var basePath = path.join(__dirname, '../../../../yd');
        it('return a stream with static old pages', function (done) {
            var program = {basedomain: 'lieferando.de'};

            var stream = messageSource.getStaticOldSource(program, log, basePath);

            stream.once('data', function (data) {
                expect(data).to.have.property('message');
                expect(data.message).to.be.an('object');
                expect(data.message).to.include.keys('basedomain', 'url', 'page', 'locale');
            });
            stream.on('end', function () {
                done();
            });

        });
    });

    describe('#getQueueSource', function () {

        var queuePool = {
            addRoutes: sinon.spy(),
            send: sinon.spy()
        };

        var msg = {foo: 'bar'};

        it('should pass the messages throw the queue', function (done) {


            var s = messageSource.getQueueSource({}, function (){}, queuePool);
            s.on('data', function (res) {
                expect(res).to.equal(msg);
                done();
            });

            s.write(msg);
        });

        it('should throw error if there is no amwpQueue in pool', function () {
            queuePool = {};
            try {
                var stream = messageSource.getQueueSource({}, function (){}, queuePool);
            } catch (e) {
                expect(e).to.be.an.instanceOf(Error);
            }
        });
    });

    describe('#getDefaultSource', function () {

        before(function () {
            var messageHelper = {
                createMessageKey: function () {return 'sad';}
            };

            messageSource.__set__({
                messageHelper: messageHelper
            });
        });

        it('should add to message basedomain url page and locale', function (done) {
            var stream = messageSource.getDefaultSource(message, function () {});
            stream.on('data', function (msg) {
                expect(msg.message).to.include.keys('basedomain', 'url', 'page', 'locale');
                done();
            });
        });
        it('should add to message values object', function (done) {
            var values = {foo: 'bar'};
            var stream = messageSource.getDefaultSource({values: JSON.stringify(values)}, function () {});

            stream.on('data', function (msg) {
                expect(msg.message).to.eql(values);
                done();
            });
        });

        it('should add to message only certain keys', function (done) {

            var message = {page: 'foo', locale: 'de_DE', uri: '/bar/foo'};
            var stream = messageSource.getDefaultSource(message, function () {});

            stream.on('data', function (msg) {
                console.log(msg);
                expect(msg.message).to.have.property('page');
                expect(msg.message).to.have.property('locale');
                expect(msg.message).to.not.have.property('uri');
                done();
            });
        });

    });
});