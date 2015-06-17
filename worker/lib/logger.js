'use strict';
var _ = require('lodash');
var config = require('../config');
var bunyan = require('bunyan');
var gelfStream = require('gelf-stream');

var logLevels = [
    'fatal',
    'error',
    'warn',
    'info',
    'debug',
    'trace'
];
/**
 * capitalize first letter
 * @param {String} word
 * @return {String}
 */
var capitalFirst = function (word) {
    return  word.charAt(0).toUpperCase() + word.substr(1, word.length);
};
//extend default winston log levels with custom
//var logLevels = _.assign(winston.config.cli.levels, config.main.logger.customLevels);

//extend default winston colors with custom
//var colors = _.assign(winston.config.cli.colors, config.main.logger.colors);

var loggers = {};

var getLogger = function (component, config) {
    if (loggers[component]) {
        return loggers[component];
    }

    var logStreams = [];
    if (config.streams && config.streams.stdout) {
        logStreams.push({
            level: config.defaultLogLevel,
            stream: process.stdout
        });
    }

    if (config.streams && config.streams.gelf) {
        logStreams.push({
            type: 'raw',
            stream: gelfStream.forBunyan(config.streams.gelf.host, config.streams.gelf.port),
            level: config.defaultLogLevel
        });
    }

    loggers[component] = bunyan.createLogger({name: config.name, streams: logStreams});

    return loggers[component];
};

/**
 * returns a log function for current component
 * metadata if passed is added to each log message
 *
 * @param  {string} component
 * @param  {object} metadata
 * @param  {object} processArguments
 * @return {function}
 */
module.exports = function (component, metadata, processArguments) {
    metadata = metadata || {};
    processArguments = processArguments || {};
    metadata.component = component;

    if (processArguments.tag) {
        metadata.tag = processArguments.tag;
    }

    if (_.contains(process.argv, '-v') || _.contains(process.argv, '--verbose')) {
        config.main.logger.defaultLogLevel = config.main.logger.verboseLogLevel;
    }

    var logger = getLogger(component, config.main.logger).child(metadata);

    /**
     * first argument could be one of the log levels
     * like:
     *   trace
     *   debug
     *   info
     *   warn
     *   error
     *   fatal
     *
     * if the first argument is not one of those string it used like log message.
     * log level in this case is 'verbose'
     * @example
     * log('verbose', 'foo bar');
     * is the same as
     * log('foo bar');
     *
     * If the last argument is the object it's perceived like a metadata
     * all other arguments could be used like in util.format function
     *
     * @example
     * log('foo %d foo %s', 1, 'bar') // foo 1 foo bar, metadata = {}
     *
     * but if you want to insert an object in to string you have to add some additional empty object
     * in order to prevent the usage of your object like a metadata
     *
     * @example
     * //wrong
     * log('foo: %j', {a: 1}) // 'foo %j', metadata = {a: 1}
     * //correct
     * log('foo: %j', {a: 1}, {}) // 'foo {a: 1}', metadata = {}
     *
     * function will do nothing in test environment in order to not print anything while tests are running
     */
    return function () {
        if (process.env.NODE_ENV === 'silent') {
            return;
        }
        var args = _.toArray(arguments);
        var head = args.shift();
        var logLevel;

        if (!_.contains(logLevels, head)) {
            logLevel = config.main.logger.verboseLogLevel;
            args.unshift(head);
        } else {
            logLevel = head;
        }

        logger[logLevel].apply(logger, args);
    };

};
