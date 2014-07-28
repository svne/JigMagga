'use strict';
var _ = require('lodash'),
    es = require('event-stream'),
    spawn = require('child_process').spawn;

module.exports = {
    getQueNames: function (program, config) {

        var amqpQueue = config.queueBaseName;
        var amqpErrorQueue = config.queueErrorBaseName;


        if (program.basedomain) {
            amqpQueue += '.' + program.basedomain;
            amqpErrorQueue = amqpErrorQueue.replace('error', program.basedomain + '.error');
        }

        if (program.errorqueue) {
            amqpQueue = amqpErrorQueue;
            amqpErrorQueue = amqpErrorQueue + '.error';
        } else if (program.errorerrorqueue) {
            amqpQueue = amqpErrorQueue + '.error';
        }

        var prefixes = config.prefixes;

        var priorities = Object.keys(_.pick(program, 'highprio', 'mediumprio', 'lowprio'));

        var priority = _.first(priorities) || 'default';

        amqpQueue += prefixes[priority];
        amqpErrorQueue += prefixes[priority];

        if (program.postfix) {
            amqpQueue += '.' + program.postfix;
        }

        return {
            amqpQueue: amqpQueue,
            amqpErrorQueue: amqpErrorQueue
        };
    },

    createSubProcess: function (modulePath, args) {
        args = args || [];

        var options = {stdio: [0, 1, 2, 'pipe', 'ipc']};
        args.unshift(modulePath);

        return spawn(process.execPath, args, options);
    },

    streamFilter: function (predicate) {
        var isAsync = (predicate.length === 2);

        if (!isAsync) {
            return es.through(function (data) {
                if (predicate(data)) {
                    this.emit('data', data);
                }
            });
        }

        return es.map(function (data, callback) {
            predicate(data, function (err, res) {
                if (err) {
                    return callback(err);
                }
                if (res) {
                    return callback(null, data);
                }
                callback();
            });
        });
    },
    streamLog: function (prefix, level) {
        level = level || 'log';

        return es.through(function (message) {
            console[level](prefix, message);
            this.emit('data', message);
        });
    },

    streamDuplex: function () {
        return es.through(
            function (data) {
                this.emit('data', data);
            },
            function () {
                this.emit('end');
            });
    }

};