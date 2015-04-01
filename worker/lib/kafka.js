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



    return {
        sendToWarehouse: _.curry(function (status, message, callback) {
            callback = callback || function () {};

            if (connectionError) {
                return;
            }
            var data = JSON.stringify({status: status, message: message});

            producer.send([
                {topic: config.topics.warehouse, messages: data}
            ], callback);

            //if there is no callback return message to allow to use this
            //function in compose
            if (!callback) {
                return message;
            }
        }, 2)
    };


};