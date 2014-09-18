#! /usr/local/bin/node
'use strict';
var args = require('commander');

var path = require('path');

var amqp = require('amqp');

args
    .option('-f, --fixture <n>', 'define the relative path to file with fixtures')
    .option('-e, --env <n>', 'set the node environment')
    .option('-q, --queue <n>', 'define a queue to put a messages in it. default is pages.generate.high')
    .option('-n, --namespace <n>', 'set the namespace of project')
    .parse(process.argv);

process.env.NODE_PROJECT_NAME = args.namespace || process.env.NODE_PROJECT_NAME;
process.env.NODE_ENV = args.env || process.env.NODE_ENV;


var config = require('../config');
var queueName = args.queue || 'pages.generate.high';

var fixtures = require(path.join(process.cwd(), args.fixture));
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

        amqpConnection.queue(queueName, {durable: true, autoDelete: false}, function (queue) {
            queue.bind('amq.direct', queueName);
            console.log('queue obtained');
            publishMessages(exc, queueName);
            process.exit();
        });
    });
});

amqpConnection.on('error', function (err) {
    console.log('amqp error', err);
});
