#! /usr/local/bin/node
'use strict';

var amqp = require('amqp');

var config = require('../config');
var fixtures = require('../testData/restaurants.json');
var amqpPublishOptions = {
    contentType: 'text/plain',
    deliveryMode: 1
};

var amqpConnection = amqp.createConnection(config.amqp.credentials);

var publishMessages = function (exchange, queue) {
    console.log('amount of records is ', fixtures.length);

    fixtures.forEach(function (message) {
        exchange.publish(queue, message, amqpPublishOptions);
    });
};
console.log('start');
amqpConnection.on('ready', function () {
    console.log("Connected to RabbitMQ");
    var exc = amqpConnection.exchange("amq.direct", {type: "direct"});

    exc.on('open', function () {
        console.log('exchange is open');

        amqpConnection.queue('pages.generate.high', {durable: true, autoDelete: false}, function (queue) {
            queue.bind('amq.direct', 'pages.generate.high');
            console.log('queue obtained');
            publishMessages(exc, 'pages.generate.high');
        });
    });
});

amqpConnection.on('error', function (err) {
    console.log('amqp error', err);
});

