'use strict';
var _ = require('lodash'),
    async = require('async'),
    format = require('util').format,
    fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn;

var config = require('../config');

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

    createSubProcess: function (modulePath, args, callback) {
        if (_.isFunction(args)) {
            callback = args;
            args = [];
        }
        args = args || [];

        var options = {stdio: [0, 1, 2, 'pipe', 'ipc']},
            child,
            waitTime;

        args.unshift(modulePath);

        child = spawn(process.execPath, args, options);
        if (!_.isFunction(callback)) {
            return child;
        }

        waitTime = (function (path) {
            return setTimeout(function () {
                callback('child process did not send a ready message :' + path);
                child.kill();
            }, 15000);
        }(modulePath));


        child.on('message', function (data) {
            if (!data.ready) {
                return;
            }
            callback(null, child);
            clearTimeout(waitTime);
        });
    },

    createSaveZipStream: function (program, message, basePath) {
        var page = encodeURIComponent(message.page),
            url = encodeURIComponent(message.url);

        var zipFileName = format('%s-%s-%s-%d.zip', page, url, message.locale, Date.now()),
            destinationPath;

        destinationPath = (_.isString(program.write)) ?
            path.join(process.cwd(), program.write) : path.join(basePath, 'tmp');

        return fs.createWriteStream(path.join(destinationPath, zipFileName));

    },

    createChildProcesses: function (args, callback) {
        if (_.isFunction(args)) {
            callback = args;
            args = [];
        }
        var that = this;
        async.parallel({
            generator: function (next) {
                that.createSubProcess(__dirname + '/../generator/index.js', args, next);
            },
            uploader: function (next) {
                that.createSubProcess(__dirname + '/../uploader/index.js', args, next);
            }
        }, callback);
    },

    generateBucketName: function (data, program) {
        var baseDomain = data.message.basedomain,
            buckets = config.main.knox.buckets;
        if (program.live || program.liveuncached) {
            return buckets.live[baseDomain] || 'www.' + baseDomain;
        }

        return buckets.stage[baseDomain] || 'stage.' + baseDomain;
    },

    isDomainInSkipList: function (domain) {
        return config.main.skipDomains.indexOf(domain) >= 0;
    },

    isMessageFormatCorrect: function (message) {
        return (message.basedomain && !this.isDomainInSkipList(message.basedomain)) &&
            ((message.url && message.page) || (!message.url && !message.page));
    }
};
