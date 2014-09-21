#! /usr/local/bin/node
'use strict';
var args = require('commander');

var path = require('path');

var amqp = require('amqp');

var fs = require('fs');


args
    .option('-f, --fixture <n>', 'define the relative path to file with fixtures')
    .option('-s, --static', 'will generate all statuc pages without dynamic params / domain is required')
    .option('-d, --basedomain <n>', 'only required when --static flag is active')
    .option('-e, --env <n>', 'set the node environment')
    .option('-q, --queue <n>', 'define a queue to put a messages in it. default is pages.generate.high')
    .option('-n, --namespace <n>', 'set the namespace of project')
    .parse(process.argv);

process.env.NODE_PROJECT_NAME = args.namespace || process.env.NODE_PROJECT_NAME;
process.env.NODE_ENV = args.env || process.env.NODE_ENV;


var config = require(__dirname + '/../config');
var domainConfig = null;
var fixtures = [];


/**
 * will return an array with all static pages in a rabbit message format
 * @param pages
 * @returns {Array}
 */
var generateStaticMessages = function(pages){
    var statics = [];
    for(var page in pages){
        for(var locale in pages[page]){
            if(pages[page][locale] && pages[page][locale].indexOf("{")  == -1){
                statics.push({
                    "url": pages[page][locale],
                    "basedomain": args.basedomain,
                    "page": page,
                    "locale": locale
                })
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

fixtures = fixtures.concat(require(path.join(process.cwd(), args.fixture)));
var amqpPublishOptions = {
    contentType: 'text/plain',
    deliveryMode: 1
};

var amqpConnection = amqp.createConnection(config.amqp.credentials);



/**
 * publish function to puplish a set of messages
 * @param exchange
 * @param queue
 * @param callback
 */
var publishMessages = function (exchange, queue, callback) {
    var length = fixtures.length;
    console.log('amount of records is ', fixtures.length);

    fixtures.forEach(function (message) {
        // proper scope for message
        !function (message) {
            // use a small timout because rabbit can not handle the amount of concurrency messages
            setTimeout(function () {
                exchange.publish(queue, message, amqpPublishOptions);
                length--;
                if(!length){
                    callback();
                }
            }, 100)
        }(message);
    });
};
console.log('start');
/**
 * Main Task
 */
amqpConnection.on('ready', function () {
    console.log("Connected to RabbitMQ \n", "Host: ", config.amqp.credentials.host, " Queue: ", queueName);
    var exc = amqpConnection.exchange("amq.direct", {type: "direct"});

    exc.on('open', function () {
        console.log('exchange is open');

        amqpConnection.queue(queueName, {durable: true, autoDelete: false}, function (queue) {
            queue.bind('amq.direct', queueName);
            console.log('queue obtained');
            publishMessages(exc, queueName, function(){
                process.exit();
            });
        });
    });
});

amqpConnection.on('error', function (err) {
    console.log('amqp error', err);
});
