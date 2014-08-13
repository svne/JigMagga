'use strict';
var format = require('util').format;
var stream = require('./streamHelper');

var amqplib = require('amqplib');

/**
 * module representing an amqp
 * @module amqp
 */

/**
 * returns a stream from a amqp queue each message from the 
 * queue is throwed to the stream
 * - shiftAfterReceive means whether the message shoud be shifted from queue just after receiving
 *   or queueShift method should be added to the message object
 * - prefetch is an amount of message that should be consumed by the amqp client without acknowledge
 * 
 * @param  {{connection: Promise, exchange: string, queue: string, prefetch: number, shiftAfterReceive: boolean}} options
 * @return {Stream}
 */
exports.getStream = function (options) {

    var duplex = stream.duplex();
    var connection = options.connection;

    options.exchange = options.exchange || 'amq.direct';
    
    connection.then(function (connected) {
        return connected.createChannel().then(function (channel) {
            var ok = channel.assertQueue(options.queue, {durable: true});
            if (options.prefetch) {
                ok = ok.then(function () {
                    channel.prefetch(options.prefetch);
                });
            }

            ok = ok.then(function () {
                duplex.emit('ready', options.queue);
                channel.consume(options.queue, function (message) {
                    if (!message) {
                        return;
                    }

                    if (options.shiftAfterReceive) {
                        duplex.write(message);
                        return channel.ack(message);
                    }
                    
                    message.queueShift = channel.ack.bind(channel, message);
                    return duplex.write(message);
                });
                
            });
            return ok;
        });
    });


    return duplex;
};


/**
 * returns amqp connection promise
 * 
 * @param  {{login: string, password: string, host: string, vhost: string}} config
 * @return {Promise}
 */
exports.getConnection = function (config) {

    var amqpUrl = format('amqp://%s:%s@%s/%s',
        config.login, config.password, config.host, config.vhost);

    return amqplib.connect(amqpUrl);
};