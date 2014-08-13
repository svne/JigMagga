'use strict';

var _ = require('lodash');
var winston = require('winston');
var config = require('../config');

require('winston-loggly');

//winston.add(winston.transports.File, config.main.logger.file);

var logLevels = _.assign(winston.config.syslog.levels, config.main.logger.customLevels);

module.exports = function (component, metadata) {
    metadata = metadata || {};

    var filename = config.main.logger.folder + '/' + component + '.log';
    var options = config.main.logger.file;
    options.filename = filename;


    var logger = new (winston.Logger)({
        levels: logLevels,
        transports: [
            new (winston.transports.Console)({colorize: true}),
            new (winston.transports.File)(options)
        ]
    });

    if (config.main.logger.loggly) {
        logger.add(winston.transports.Loggly, config.main.logger.loggly);
    }

    winston.addColors(config.main.logger.colors);

    return function () {
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