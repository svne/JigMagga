'use strict';
var amqp = require('amqp');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var emitStream = require('emit-stream');

exports.getStream = function (options) {

    var _source =  {
        queue: options.queue,
        connection: options.connection,
        exchange: options.exchange
    };

    var queueOptions = {
        durable: true,
        autoDelete: false
    };

    var createEmitter = function () {
        var emitter = new EventEmitter();


        _source.connection.on('ready', function () {
            console.log(options.queue, 'connection is ready');
            var exchange = _source.connection.exchange('amq.direct', {type: 'direct'});

            exchange.on('open', function () {
                console.log(options.queue, 'exchange is open');

                _source.connection.queue(_source.queue, queueOptions, function (queue) {
                    console.log(options.queue, 'queue is connected');
                    queue.bind(_source.exchange, _source.queue);

                    queue.subscribe({ack: true, prefetchCount: 1}, function (data) {

                        if (options.shiftAfterReceive) {
                            emitter.emit(data);
                            return queue.shift();
                        }

                        if (_.isArray(data) && data.length === 1) {
                            data[0].queue = queue;
                        } else {
                            data.queue = queue;
                        }

                        emitter.emit(data);
                    });
                });
            });
        });

        return emitter;
    };

    return emitStream(createEmitter());
};


exports.getConnection = function (config) {
    config.heartbeat = 30;

    return amqp.createConnection(
        config,
        {
            reconnect: false
        }
    );
};