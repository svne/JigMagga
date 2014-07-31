'use strict';
var _ = require('lodash'),
    format = require('util').format,
    fs = require('fs'),
    path = require('path'),
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

    createSaveZipStream: function (program, message, basePath) {
        var zipFileName = format('%s-%s-%s-%d.zip', message.page, message.url, message.locale, Date.now()),
            destinationPath;

        destinationPath = (_.isString(program.write)) ?
            path.join(process.cwd(), program.write) : path.join(basePath, 'tmp');

        return fs.createWriteStream(path.join(destinationPath, zipFileName));

    }
};