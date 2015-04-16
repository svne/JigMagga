'use strict';

var kafka = require('kafka-node'),
    _ = require('lodash');


var producer;

/**
 *
 * @param {{connectionString: string, clientId: string}} config
 * @return {exports.Producer}
 */
module.exports = function (config) {
    config = config || {};

    if (producer) {
        return producer;
    }
    var connectionError = null;

    var client = new kafka.Client(config.connectionString, config.clientId);
    producer = new kafka.Producer(client);

    producer.on('ready', function () {
        var topicNames = _.values(config.topics);

        producer.createTopics(topicNames, true, function (err, data) {
            if (err) {
                throw err;
            }

            console.log('Topic created', data);
        });
    });

    producer.on('error', function (err) {
        console.log('Kafka connection error', err);
        connectionError = true;
    });

    var stringifyMessage = function (status, message) {
        return JSON.stringify({origin:config.origin, status: status, message: message});
    };


    return {
        sendToWarehouse: _.curry(function (formatter, status, message, callback) {
            formatter = formatter || function bareMessage(msg, cb) {
                return cb(null, msg);
            };
            callback = callback || function () {};

            if (connectionError) {
                return;
            }
            formatter(message, function (err, formattedMessage) {
                if (err) {
                    return callback(err);
                }
                var data;

                if (_.isArray(formattedMessage)) {
                    data = formattedMessage.map(function (item) {
                        return stringifyMessage(status, item);
                    });
                } else {
                    data = stringifyMessage(status, formattedMessage);
                }

                producer.send([
                    {topic: config.topics.warehouse, messages: data}
                ], callback);
            });
        }, 3)
    };


};