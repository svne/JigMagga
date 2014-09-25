'use strict';
process.env.NODE_PROJECT_NAME = 'yd';

var _ = require('lodash');
var async = require('async');
var amqp = require('../lib/amqp');
var config = require('../config');


var queues = {
    amqpQueue: 'page.generate.high'
};
console.log(config.amqp);
var connection = amqp.getConnection(config.amqp);
var queuePool = new amqp.QueuePool(queues, connection);


var message = 'foo bar';


// async.eachSeries(_.range(100000), function (item, next) {
//     queuePool.amqpQueue.publish(message, {
//         contentType: 'text/plain'
//     }, next);
// }, function (err) {
//     if (err) console.log(err);

//     console.log('the end');
// });

// var amqpQueueStream = queuePool.amqpQueue.getStream({shiftAfterReceive: true});

var q = 'page.generate.high';


function consumer(conn) {
  var ok = conn.createChannel(on_open);

  function on_open(err, ch) {
    if (err != null) console.log(err);
    ch.assertQueue(q);
    var amount = 0;
    console.log('connect', q);

    ch.consume(q, function(msg) {
        console.log(q);
      if (msg !== null) {
        console.log(msg.content.toString(), ++amount);
        (function (channel) {
            setTimeout(function () {
                channel.ack(msg);
            }, 300);
        }(ch));

      }
    });
  }
}

require('amqplib/callback_api')
  .connect('', function(err, conn) {
    if (err != null) console.log(err);
    consumer(conn);
  });


// var amqp = require('amqp');

// var connection = amqp.createConnection({
//     host: '127.0.0.1',
//     vhost: '',
//     port: 5672
// });

//Wait for connection to become established.
// connection.once('ready', function () {
//     console.log('ready');
//     var exc = connection.exchange("amq.direct");
//     exc.on("open", function () {
//         console.log('open');
//         // Use the default 'amq.topic' exchange
//         connection.queue('page.generate.high',  {durable: true, autoDelete: false, ack: true}, function (q) {
//             q.bind('amq.direct', 'page.generate.high');
//             // Catch all messages
//             console.log('page.generate.high', q);
//             // q.bind('#');
//             var amount = 0;
//             // Receive messages
//             q.subscribe(function (message) {
//               // Print messages to stdout
//               console.log(message, ++amount);
//               setTimeout(function () {
//                  q.shift();
//               }, 300);
//             });
//         });
//     });

// });


