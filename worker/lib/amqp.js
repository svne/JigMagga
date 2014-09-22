'use strict';
var _ = require('lodash');
var querystring = require('querystring');
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
var getChannel = function (connection, queue, callback) {
    if (queue.channel) {
        return process.nextTick(function () {
            callback(null, queue.channel);
        });
    }

    connection
        .then(function (connected) {
            return connected.createChannel().then(function (ch) {
                queue.channel = ch;
                return callback(null, ch);
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
    var that = this;
    // options.exchange = options.exchange || 'amq.direct';

    getChannel(connection, this, function (err, channel) {
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
            }).then(function (res) {
                that.consumerTag = res.consumerTag;
            });

        });
    });

    return duplex;
};

var cancelStream = function (callback) {
    if (!this.channel || !this.consumerTag) {
        throw new Error('can not destroy stream before it is ready to consume');
    }
    var that = this;

    this.channel.cancel(this.consumerTag)
        .then(function (ok) {
            that.channel = null;

            callback(null, ok);
        }, callback);
};

/**
 * publish message to queue
 *
 * @param  {*} message
 * @param  {?object} options
 */
var publish = exports.publish = function (message, options, callback) {
    options = options || {};
    callback = callback || function (err) {
        if (err) {
            throw new Error(err);
        }
    };
    options.contentType = options.contentType || 'text/plain';

    message = _.isString(message) ? message : JSON.stringify(message);
    var queue = options.queue || this.name;
    delete options.queue;

    this.connection
        .then(function (connected) {
            return connected.createChannel().then(function (channel) {
                var ok = channel.assertQueue(queue, {durable: true});

                return ok.then(function () {
                    message = new Buffer(message);
                    channel.sendToQueue(queue, message, options);
                    channel.close();
                });
            });
        })
        .then(function (res) {
            callback(null, res);
        }, function (err) {
            callback(err);
        });
};


/**
 * returns amqp connection promise
 *
 * @param  {{login: string, password: string, host: string, vhost: string}} config
 * @return {Promise}
 */
exports.getConnection = function (config) {
    var credentials = config.credentials;

    var amqpUrl = format('amqp://%s:%s@%s/%s',
        credentials.login, credentials.password, credentials.host, credentials.vhost);
    if (config.options) {
        amqpUrl += '?' + querystring.stringify(config.options);
    }

    return amqplib.connect(amqpUrl);
};

var QueuePool = function (queues, connection, options) {
    var that = this;
    options = options || {};

    _.each(queues, function (queue, name) {

        that[name] = {
            name: queue,
            connection: connection,
            getStream: getStream,
            cancelStream: cancelStream,
            publish: publish,
            options: options,
            channel: null,
            consumerTag: null
        };
    });
};

exports.QueuePool = QueuePool;

