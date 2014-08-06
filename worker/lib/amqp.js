'use strict';
var amqp = require('amqp');
var _ = require('lodash');
var stream = require('./streamHelper');



exports.getStream = function (options) {

    var duplex = stream.duplex();

    var _source =  {
        queue: options.queue,
        connection: options.connection,
        exchange: options.exchange
    };

    var queueOptions = {
        durable: true,
        autoDelete: false
    };


    _source.connection.on('ready', function () {
        var exchange = _source.connection.exchange('amq.direct', {type: 'direct'});

        exchange.on('open', function () {

            _source.connection.queue(_source.queue, queueOptions, function (queue) {
                duplex.emit('ready', _source.queue);
                queue.bind(_source.exchange, _source.queue);

                queue.subscribe({ack: true, prefetchCount: 1}, function (data) {

                    if (options.shiftAfterReceive) {
                        duplex.write(data);
                        return queue.shift();
                    }

                    if (_.isArray(data) && data.length === 1) {
                        data[0].queueShift = queue.shift.bind(queue);
                    } else {
                        data.queueShift = queue.shift.bind(queue);
                    }
                    duplex.write(data);
                    data = null;
                });
            });
        });
    });

    return duplex;
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