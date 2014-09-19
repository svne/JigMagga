'use strict';
var path = require('path');
var _ = require('lodash');
var winston = require('winston');
var config = require('../config');

require('winston-loggly');
//extend default winston log levels with custom
var logLevels = _.assign(winston.config.cli.levels, config.main.logger.customLevels);

//extend default winston colors with custom
var colors = _.assign(winston.config.cli.colors, config.main.logger.colors);

/**
 * returns a log function for current component
 * metadata if passed is added to each log message
 *
 * @param  {string} component
 * @param  {object} metadata
 * @return {function}
 */
module.exports = function (component, metadata) {
    metadata = metadata || {};

    var filename = path.join(__dirname, '../..',  config.main.logger.folder, component + '_' + process.pid + '.log');
    var options = config.main.logger.file;
    options.filename = filename;

    var logger = new (winston.Logger)({
        levels: logLevels,
        transports: [
            new (winston.transports.Console)(config.main.logger.console)
            // new (winston.transports.File)(options)
        ]
    });

    if (config.main.logger.loggly) {
        logger.add(winston.transports.Loggly, config.main.logger.loggly);
    }

    winston.addColors(colors);

    /**
     * first argument could be one of the log levels
     * like:
     *  info,
     *  fail
     *  success,
     *  warn,
     *  error,
     *  debug
     *  alert
     *
     * if the first argument is not one of those string it used like log message.
     * log level in this case is 'info'
     * @example
     * log('info', 'foo bar');
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
        var meta = args.pop();

        if (_.isPlainObject(meta)) {
            meta = _.assign(meta, metadata);
            args.push(meta);
        } else {
            args.push(meta);
            args.push(metadata);
        }

        if (!_.contains(_.keys(logLevels), args[0])) {
            args.unshift(config.main.logger.defaultLogLevel);
        }

        logger.log.apply(logger, args);
    };

};
