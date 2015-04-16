'use strict';

var configMerge = require('jmUtil').configMerge,
    path = require('path'),
    _ = require('lodash'),
    parseArgs = require('../parseArguments');

var args = parseArgs(process.argv);
var basePath = (args.namespace) ? path.join(process.cwd(), args.namespace, 'page') : process.cwd();

var getMessage = _.curry(function (message, url) {
    return {
        basedomain: message.basedomain,
        url: url.replace('{url}', message.url)
    };
});

module.exports = {
    /**
     *
     * @param {WorkerMessage} message
     * @param {Function} callback
     */
    statusCheckerFormatter: function (message, callback) {
        message = message.originalMessage || message;

        if (!message.basedomain || !message.page) {
            return callback('wrong message format');
        }

        configMerge.getPageConfig(basePath, message.basedomain, null, function (err, config) {
            if (err) {
                return callback(err);
            }
            var urls = config.pages[message.page],
                result;

            if (message.locale) {
                result = getMessage(message, urls[message.locale]);
            } else {
                result = _.values(urls).map(getMessage(message));
            }

            callback(null, result);
        });
    }
};