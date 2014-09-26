#! /usr/local/bin/node
/**
 * Created by toni on 9/19/14.
 *
 *
 * This script will exit with 1 when there are messages in the queue and with exit code 0 when the queue is empty.
 * You can use that in your CI to check when the deploy is done.
 *
 */

'use strict';
var args = require('commander');
var http = require('http');
var util = require('util');

args
    .option('-e, --env <n>', 'set the node environment')
    .option('-q, --queue <n>', 'define a queue name to check')
    .option('-n, --namespace <n>', 'set the namespace of project')
    .option('-o, --httpoptions [value]', 'parse http options that will be extend from config', JSON.parse)
    .parse(process.argv);



process.env.NODE_PROJECT_NAME = args.namespace || process.env.NODE_PROJECT_NAME;
process.env.NODE_ENV = args.env || process.env.NODE_ENV;



var config = require(__dirname + '/../config');
var queueName = args.queue;


var options = util._extend({
    hostname: config.amqp.credentials.host,
    port: config.amqp.credentials.port || 15672,
    path: "/api/queues/" + config.amqp.credentials.vhost + "/" + queueName,
    method: 'GET',
    auth: config.amqp.credentials.login + ":" + config.amqp.credentials.password
}, args.httpoptions);



http.get(options, function (res) {
    console.log("Got response: " + res.statusCode);
    res.setEncoding('utf8');
    var data = "";
    res.on('data', function (chunk) {
        data += chunk;
    });
    res.on('end', function () {
        var queue = JSON.parse(data);
        console.log("There are " + queue.messages + " messages in the queue " + queueName);
        if (queue.messages === 0) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    });
}).on('error', function (e) {
    console.log("Got error: " + e.message, "\n", options);
    process.exit(1);
});
