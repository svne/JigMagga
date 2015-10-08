#! /usr/local/bin/node
'use strict';
var args = require('commander'),
    _ = require('lodash'),
    async = require('async'),
    fs = require('fs'),
    path = require('path');

var amqp = require('../lib/amqplib');

args
    .option('-f, --fixture <n>', 'define the relative path to file with fixtures')
    .option('-s, --static', 'will generate all statuc pages without dynamic params / domain is required')
    .option('-d, --basedomain <n>', 'only required when --static flag is active')
    .option('-e, --env <n>', 'set the node environment')
    .option('-t, --times <n>', 'amount times that script should push message to queue default 1', 1)
    .option('-q, --queue <n>', 'define a queue to put a messages in it. default is pages.generate.high')
    .option('-n, --namespace <n>', 'set the namespace of project')
    .parse(process.argv);

process.env.NODE_PROJECT_NAME = args.namespace || process.env.NODE_PROJECT_NAME;
process.env.NODE_ENV = args.env || process.env.NODE_ENV;


var config = require(__dirname + '/../config'),
    domainConfig = null,
    fixtures = [];


/**
 * will return an array with all static pages in a rabbit message format
 * @param pages
 * @returns {Array}
 */
var generateStaticMessages = function(pages){
    var statics = [];
    for(var page in pages){
        for(var locale in pages[page]){
            if(pages[page][locale] && pages[page][locale].indexOf("{")  === -1){
                statics.push({
                    "url": pages[page][locale],
                    "basedomain": args.basedomain,
                    "page": page,
                    "locale": locale
                });
            }
        }
    }
    return statics;
};

if(args.static){
    domainConfig = JSON.parse(fs.readFileSync(path.join(__dirname + '/../..', args.namespace + "/page/" + args.basedomain + "/" + args.basedomain + ".conf")));
    fixtures = fixtures.concat(generateStaticMessages(domainConfig.pages));
}

var queueName = args.queue || 'pages.generate.high';

if(args.fixture){
    fixtures = fixtures.concat(require(path.join(process.cwd(), args.fixture)));
}

var amqpPublishOptions = {
    contentType: 'text/plain',
    deliveryMode: 1
};

console.log('amqp server', config.amqp.credentials);


/**
 * publish function to publish a set of messages
 * @param queue
 * @param callback
 */
var publishMessages = function (queue, callback) {
    console.log('amount of records is ', fixtures.length * args.times);

    async.eachSeries(_.range(args.times), function (time, cb) {
        async.eachSeries(fixtures, function (message, next) {
            queue.publish(message, amqpPublishOptions, next);
        }, cb);
    }, callback);
};
console.log('start');

console.log('queue obtained');
/**
 * Main Task
 */
var amqpConnection = amqp.getConnection(config.amqp);


var pool = new amqp.QueuePool({queue: queueName}, amqpConnection);

publishMessages(pool.queue, function(err) {
    if (err) {
        return console.log('amqp err', err);
    }
    console.log('finish... exiting');
    setTimeout(function () {
        process.exit();
    }, 2000);
});


