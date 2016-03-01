'use strict';

var _ = require('lodash'),
    gelfStream = require('gelf-stream'),
    konphyg = require('konphyg'),
    bunyan = require('bunyan'),
    bunyanLogstash = require('bunyan-logstash'),
    path = require('path'),
    config = require('../config'),
    program = require('../parseArguments')(process.argv);


/**
 * Logger works with stdout, graylog or/and logstash.
 *
 * <code>
 * var log = logger('worker',  {basedomain: program.basedomain}, program);
 * log('some information');
 * log('warn', 'another information');
 * </code>
 *
 * @param {String} component
 * @param {Object} metadata
 * @param {Object} processArguments
 * @returns {Function}
 */
module.exports = function (component, metadata, processArguments) {

    metadata = metadata || {};
    processArguments = processArguments || {};
    metadata.component = component;

    if (processArguments.tag) {
        metadata.tag = processArguments.tag;
    }

    // bunyan log levels
    var logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

    // wanna use graylog?
    var graylogConfig = {
        "active": true,
        "host": null,
        "port": null
    };

    // graylog settings from the command line
    if (program.graylogHost && program.graylogPort) {

        graylogConfig.host = program.graylogHost;
        graylogConfig.port = program.graylogPort;

    } else if (config.main.logger.graylog) {

        // graylog settings from config file
        /*
            An example of the graylog setting in the config file

                logger: {
                    "graylog": {
                         "host": "graylog-domain.com",
                         "port": 12345
                    }
                }
         */

        graylogConfig.host = config.main.logger.graylog.host;
        graylogConfig.port = config.main.logger.graylog.port;

    } else {
        graylogConfig.active = false;
    }

    var logger = bunyan.createLogger({
            name:    config.main.logger.name || 'htmlWorker',
            streams: [
                {
                    level: config.main.logger.defaultLogLevel,
                    type: 'raw',
                    stream: bunyanLogstash.createStream({
                        host: config.main.logger.logstash.host,
                        port: config.main.logger.logstash.port
                    })
                }
                ,
                {
                    stream: process.stdout,
                    level:  'debug'
                }
            ]
        })
        .child({metadata: metadata});

    // add graylog stream
    if (graylogConfig.active) {
        var graylog = gelfStream.forBunyan(graylogConfig.host, graylogConfig.port);
        var graylogStream = {
            type: 'raw',
            stream: graylog,
            level: 'info'
        };
        logger.addStream(graylogStream);
    }

    // GELF stream has to be explicitly ended
    process.on('exit', function () {
        logger.error('Exiting...');
        if (graylogConfig.active) {
            graylog.end();
        }
    });

    // Catches ctrl+c event
    process.on('SIGINT', function () {
        var errorMessage = 'Interupted...';

        logger.error(errorMessage);
        return setTimeout(function () {
            throw new Error(errorMessage);
        }, 100);
    });

    // if using standard the standard bunyan logger (without logger factory) uncomment the next statement
    //return logger;

    // factory for the old logging style
    return function loggerFactory () {

        if (process.env.NODE_ENV === 'silent') {
            return;
        }

        var args = Array.prototype.slice.apply(arguments);
        var meta = args.pop();

        if (_.isPlainObject(meta)) {
            meta = _.assign(meta, metadata);
            args.push(meta);
        } else {
            args.push(meta);
            args.push(metadata);
        }

        // will be called
        var func;
        if (logLevels.indexOf(args[0]) !== -1) {        // log level is known
            func = args.shift();
        } else {
            func = config.main.logger.defaultLogLevel;  // unknown log level
        }

        logger[func].apply(logger, args);
    };
};
