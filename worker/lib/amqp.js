'use strict';
var _ = require('lodash');
var format = require('util').format;
var stream = require('./streamHelper');

var amqplib = require('amqplib');

var channel = null;

/**
 * returns amqp channel from global variable if it was created before
 * or creates it and push to the global var
 * 
 * @param  {Promise}   connection
 * @param  {Function}  callback
 */
var getChannel = function (connection, callback) {
    if (channel) {
        return process.nextTick(function () {
            callback(null, callback);
        });
    }

    connection
        .then(function (connected) {
            return connected.createChannel().then(function (ch) {
                channel = ch;
                return callback(null, channel);
            });
        })
        .catch(function (err) {
           return callback(err); 
        });
};


/**
 * module representing an amqp
 * @module amqp
 */

/**
 * returns a stream from a amqp queue each message from the 
 * queue is throed to the stream
 * - shiftAfterReceive means whether the message should be shifted from queue just after receiving
 *   or queueShift method should be added to the message object
 * - prefetch is an amount of message that should be consumed by the amqp client without acknowledge
 * 
 * @param  {{connection: Promise, exchange: string, queue: string, prefetch: number, shiftAfterReceive: boolean}} options
 * @return {Stream}
 */
var getStream = exports.getStream = function (options) {
    options = options || {};
    var duplex = stream.duplex();
    var connection = this.connection || options.connection;
    var queue = this.name || options.queue;
    var prefetch = this.options.prefetch || options.prefetch;

    // options.exchange = options.exchange || 'amq.direct';
    
    getChannel(connection, function (err, channel) {
        if (err) {
            throw new Error(err);
        }
        var ok = channel.assertQueue(queue, {durable: true});
        if (prefetch) {
            ok = ok.then(function () {
                channel.prefetch(prefetch);
            });
        }

        ok = ok.then(function () {
            duplex.emit('ready', queue);
            channel.on('close', function () {
                console.log('CHANNEL IS CLOASING');
            });

            channel.on('error', function () {
                console.log('ERROR IN CHANNEL');
                console.log(arguments);
            });

            channel.consume(queue, function (message) {
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
    });


    return duplex;
};

/**
 * publish message to queue 
 * 
 * @param  {*} message
 * @param  {?object} options
 */
var publish = exports.publish = function (message, options) {
    options = options || {};

    var queue = options.queue || this.name;
    this.connection
        .then(function (connected) {
            return connected.createChannel().then(function (channel) {
                var ok = channel.assertQueue(queue, {durable: true});

                return ok.then(function () {
                    message = new Buffer(JSON.stringify(message));
                    channel.sendToQueue(queue, message, {contentType: 'text/plain'});
                    // channel.close();
                });
            });
        })
        .catch(function (err) {
            throw new Error(err);
        });
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

var QueuePool = function (queues, connection, options) {
    var that = this;

    _.each(queues, function (queue, name) {
        
        that[name] = {
            name: queue,
            connection: connection,
            getStream: getStream,
            publish: publish,
            options: options
        };
    });
};

exports.QueuePool = QueuePool;

