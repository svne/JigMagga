/*global describe, it, afterEach: true*/

'use strict';
var _ = require('lodash');
var async = require('async');
var expect = require('chai').expect;

var amqp = require('../../lib/amqp');
var config = require('../../config');

describe('QueuePool', function () {
    var queues = {
        amqpQueue: 'page.generate.high',
        amqpDoneQueue: 'page.generate.done'
    };
    var connection = amqp.getConnection(config.amqp);
    var queuePool = new amqp.QueuePool(queues, connection);

    it('should create a pool of queues with getStream and publish methods', function () {
        expect(queuePool).to.include.keys('amqpQueue', 'amqpDoneQueue');

        expect(queuePool.amqpQueue).to.have.property('getStream');
        expect(queuePool.amqpQueue).to.have.property('publish');
    });

    describe('publish subscribe', function () {

        it('should get possibility to publish message to some queue and obtain it in stream', function (done) {
            var amqpQueueStream = queuePool.amqpQueue.getStream({shiftAfterReceive: true});
            var message = 'foo bar';

            amqpQueueStream.once('data', function (msg) {
                var content = msg.data.toString();

                expect(content).to.eql(message);
                expect(msg.contentType).to.eql('text/plain');
                done();
            });

            amqpQueueStream.once('ready', function () {
                queuePool.amqpQueue.publish(message);
            });
        });

        it('should get possibility to receive message with queueShift method and do not shift it automatically', function (done) {
            var amqpQueueStream = queuePool.amqpDoneQueue.getStream();
            var message = 'foo bar';

            amqpQueueStream.once('data', function (msg) {
                var content = msg.data.toString();
                expect(msg.queueShift).to.be.a('function');
                expect(content).to.eql(message);
                expect(msg.contentType).to.eql('text/plain');
                msg.queueShift();
                done();
            });

            amqpQueueStream.once('ready', function () {
                queuePool.amqpDoneQueue.publish(message);
            });
        });

        it.skip('should execute callback after publish to queue', function (done) {
            var connection = amqp.getConnection(config.amqp);

            connection.on('ready', function () {
                var queuePool = new amqp.QueuePool({testQueue: 'pages.generate.m.lieferando.de.deploy'}, connection);
                var message = 'foo bar';


                async.eachSeries(_.range(200), function (item, next) {
                    queuePool.testQueue.publish(message + item, {
                        contentType: 'text/plain'
                    });
                    console.log(item);
                    setTimeout(function () {
                        next();
                    }, 100);
                }, done);
            });

        });
    });
});
