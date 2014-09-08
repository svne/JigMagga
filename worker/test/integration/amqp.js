/*global describe, it, afterEach: true*/

'use strict';
var _ = require('lodash');
var expect = require('chai').expect;

var amqp = require('../../lib/amqp');
var config = require('../../config');

describe('QueuePool', function () {
    var queues = {
        amqpQueue: 'page.generate.high',
        amqpDoneQueue: 'page.generate.done'
    };
    var connection = amqp.getConnection(config.amqp.credentials);
    var queuePool = new amqp.QueuePool(queues, connection);

    it('should create a pool of queues with getStream and publish methods', function () {
        expect(queuePool).to.include.keys('amqpQueue', 'amqpDoneQueue');
        
        expect(queuePool.amqpQueue).to.have.property('getStream');
        expect(queuePool.amqpQueue).to.have.property('publish');
    });

    describe('publish subscribe', function () {

        afterEach(function (done) {
            queuePool.amqpQueue.cancelStream(function (err) {
                done(err);
            });
        });

        it('should get possibility to publish message to some queue and obtain it in stream', function (done) {
            var amqpQueueStream = queuePool.amqpQueue.getStream({shiftAfterReceive: true});
            var message = 'foo bar';

            amqpQueueStream.once('data', function (msg) {
                var content = msg.content.toString();

                expect(content).to.eql(message);
                expect(msg.properties.contentType).to.eql('text/plain');
                done();
            });

            queuePool.amqpQueue.publish(message);
        });

        it('should get possibility to receive message with queueShift method and do not shift it automatically', function (done) {
            var amqpQueueStream = queuePool.amqpQueue.getStream();
            var message = 'foo bar';

            amqpQueueStream.once('data', function (msg) {
                var content = msg.content.toString();
                expect(msg.queueShift).to.be.a('function');
                expect(content).to.eql(message);
                expect(msg.properties.contentType).to.eql('text/plain');
                msg.queueShift();
                done();
            });

            queuePool.amqpQueue.publish(message);
        });
    });
});
