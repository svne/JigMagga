'use strict';
var _ = require('lodash'),
    walk = require('walk'),
    async = require('async'),
    format = require('util').format,
    fsExtra = require('fs-extra'),
    path = require('path'),
    spawn = require('child_process').spawn;

var config = require('../config');
var log = require('./logger')('worker', {component: 'worker', processId: process.pid}),
    TimeDiff = require('./timeDiff');

var timeDiff = new TimeDiff(log);

// @type {Object.<string, {count: number, queueShift: function, timeDiff: TimeDiff}>} - storage of message acknowledge functions
var messageAckStorage = {};

module.exports = {
    /**
     * check correctness of URL
     *
     * @param  {string} url
     * @return {boolean}
     */
    isUrlCorrect: function (url) {
        var regexp = new RegExp('[^a-zA-Z0-9-_//]+', 'i');

        return !regexp.test(url);
    },

    /**
     * save queueShift function for some message to message
     * acknowledge functions storage
     *
     * @param {{queueShift: ?function, key: ?string}} data
     */
    setAckToStorage: function (data) {

        if(!_.isFunction(data.queueShift) || !data.key) {
            return;
        }
        if (!messageAckStorage[data.key]) {
            messageAckStorage[data.key] = {
                count: 1,
                queueShift: data.queueShift,
                timeDiff: timeDiff.create('message:' + data.message.page)
            };
        } else {
            messageAckStorage[data.key].count += 1;
        }

    },

    /**
     * execute queue acknowledge function and shift message from the queue
     * by message key
     *
     * @param  {string} messageKey
     */
    executeAck: function (messageKey) {
        if (!messageKey || !_.isPlainObject(messageAckStorage[messageKey])) {
            return;
        }

        if (messageAckStorage[messageKey].count !== 1) {
            messageAckStorage[messageKey].count -= 1;
            return;
        }

        messageAckStorage[messageKey].queueShift();
        messageAckStorage[messageKey].timeDiff.stop();
        messageAckStorage[messageKey] = null;
    },

    /**
     * returns a an object with main queue and error queue names
     * based on program priority keys, basedomain and prefix
     *
     * @param  {object} program
     * @param  {object} config
     * @return {{amqpQueue: string, amqpErrorQueue: string}}
     */
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
            amqpErrorQueue: amqpErrorQueue,
            amqpDoneQueue: 'pages.generate.done'
        };
    },

    /**
     * create sub process based on child_process spawn command
     * with pipe and ipc channels enabled.
     * if callback is present it waits for ready message from a child
     * end return process instance in callback
     *
     * @param  {string}   modulePath - path to js file that will be executed like a process
     * @param  {array}    args       - arguments that will be passed to a module
     * @param  {Function} callback
     */
    createSubProcess: function (modulePath, args, callback) {
        if (_.isFunction(args)) {
            callback = args;
            args = [];
        }
        args = args || [];

        var options = {stdio: [0, 1, 2, 'pipe', 'ipc']},
            child,
            waitTime;
        if (args[0] !== 'debug') {
            args.unshift(modulePath);
        } else {
            args[0] = modulePath;
            args.unshift('--debug-brk');
        }

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

        var onMessage = function onMessage(data) {
            if (!data.ready) {
                return;
            }
            child.removeListener('message', onMessage);
            callback(null, child);
            clearTimeout(waitTime);
        };

        child.on('message', onMessage);
    },

    /**
     * returns a name of zip archive for a message based on page name, url, locale
     * and current date
     * if write key is a string it uses it like a relative path to the folder with zip files
     *
     * @param  {{write: boolean}} program
     * @param  {{page: string, url: string, locale: string}} message
     * @param  {string} basePath
     * @return {string}
     */
    getZipName: function (program, message, basePath) {
        var page = encodeURIComponent(message.page),
            url = encodeURIComponent(message.url);

        var zipFileName = format('%s-%s-%s-%d.zip', page, url, message.locale, Date.now()),
            destinationPath;

        destinationPath = (_.isString(program.write)) ?
            path.join(process.cwd(), program.write) : path.join(basePath, 'tmp');

        return path.join(destinationPath, zipFileName);

    },

    /**
     * save files on disk from file list
     * create the path for each file if it does not exist
     *
     * @param {Array.<{path:String, content:String}>} fileList
     * @param {function} log
     * @param {function} callback
     */
    saveFiles: function (fileList, log, callback) {
        async.each(fileList, function (file, next) {
            log('save file to:', file.path);
            fsExtra.outputFile(file.path, file.content, next);
        }, callback);
    },

    /**
     * creates a generator and uploader process in asynchronous mode
     *
     * @param  {array.<String>}   args      - array that throw to each process
     * @param  {Function} callback
     */
    createChildProcesses: function (args, callback) {
        if (_.isFunction(args)) {
            callback = args;
            args = [];
        }
        var that = this;
        async.parallel({
            generator: function (next) {
                that.createSubProcess(__dirname + '/../generator/index.js', _.cloneDeep(args), next);
            },
            uploader: function (next) {
                that.createSubProcess(__dirname + '/../uploader/index.js', _.cloneDeep(args), next);
            }
        }, callback);
    },

    /**
     * generate the name of bucket using message basedomain and
     * knox.buckets list from config
     *
     * @param  {{message: {basedomain: string}}} data    [description]
     * @param  {{live: boolean, liveuncached: boolean}} program [description]
     * @return {string}
     */
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

    /**
     * check correctness of message object. It must have basedomain field and this
     * domain should not be in the skip list. It should have both url and page fields
     * or should not have both of them
     *
     * @param  {object}  message
     * @return {Boolean}
     */
    isMessageFormatCorrect: function (message) {
        return Boolean((message.basedomain && !this.isDomainInSkipList(message.basedomain)) &&
                    ((message.url && message.page) || (!message.url && !message.page)));
    },

    /**
     * create a meta data for log message from message object
     *
     * @param  {object} msg
     * @return {object}
     */
    getMeta: function (msg) {
        return _.pick(msg, ['page', 'url', 'locale', 'basedomain']);
    },

    /**
     * get a list of file from folder recursively
     * predicate param is a function that allow to filter files
     *
     * @param  {string}      folderPath  - path to folder
     * @param  {?Function}   predicate   - if exists executed for each file if it returns true file is included to result
     * @param  {Function}    callback
     */
    getFolderFiles: function (folderPath, predicate, callback) {
        if (!callback) {
            callback = predicate;
            predicate = null;
        }
        var walker = walk.walk(folderPath, {});
        var files = [];

        walker.on('files', function (root, stats, next) {
            stats = stats.map(function (stat) {
                stat.path = path.join(root, stat.name);
                return stat;
            });

            if (_.isFunction(predicate)) {
                stats = stats.filter(predicate);
            }

            files = files.concat(stats);
            next();
        });

        walker.on('errors', function (root, nodeStatsArray, next) {
            next('error while getting all files');
        });

        walker.on('end', function () {
            callback(null, files);
        });

    },

    /**
     * generate a redis key by adding pid to redis key name
     *
     * @param {String} name
     * @param {(String|Number)} pid
     * @return {string}
     */
    getRedisKey: function (name, pid) {
        return name + ':' + pid;
    }
};
