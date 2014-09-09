/*global describe, it, before: true*/
'use strict';

var path = require('path');
var rewire = require('rewire');
var streamHelper = require('../../../lib/streamHelper');
var expect = require('chai').expect;

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
            amqpQueue: {}
        };
        var messageHelper = {
            getMessageParser: function () {return streamHelper.duplex()}
        };

        messageSource.__set__({
            messageHelper: messageHelper
        });

        it('should proceed the messages throw the queue', function (done) {
            var source = streamHelper.duplex();
            queuePool.amqpQueue.getStream = function () {
                return source;
            };
            var msg = {foo: 'bar'};
            var stream = messageSource.getQueueSource({}, function (){}, queuePool);
            stream.on('data', function (data) {
                expect(data).to.eql(msg);
                done();
            });
            source.write(msg);
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
   
        it('should add to message any field with Id postfix', function (done) {
            var message = {fooId: 'bar', bar: 'bar'};
            var stream = messageSource.getDefaultSource(message, function () {});
            
            stream.on('data', function (msg) {
                expect(msg.message).to.have.property('fooId', 'bar');
                expect(msg.message).to.not.have.property('bar');
                done();
            });
        });
              
    });
});