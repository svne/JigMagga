'use strict';

var es = require('event-stream'),
    _ = require('lodash'),
    configMerge = require('jmUtil').configMerge,
    path = require('path');


module.exports = {

    getConfigStream: function () {
        return es.map(function (data, callback) {
            var message = data.message,
                result,
                basePath = data.basePath;

            if (data.isPageConfigLoaded) {
                return callback(null, data);
            }

            basePath = path.join(basePath, 'page');

            configMerge.getPageConfig(basePath, message.basedomain, message.page, function (err, config) {
                if (err) {
                    return callback(err);
                }

                result = _.cloneDeep(data);
                result.config = config;
                result.isPageConfigLoaded = (message.page) ? true : false;

                callback(null, result);
            });
        });
    }
}