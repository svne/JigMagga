'use strict';

var es = require('event-stream'),
    _ = require('lodash'),
    configMerge = require('jmUtil').configMerge,
    path = require('path');

/**
 * @module configMerge
 */

/**
 * @name WorkerMessage
 * @type {object}
 * @property {string} locale 
 * @property {string} page 
 * @property {string} basedomain 
 * @property {string} domain 
 */


module.exports = {
    /**
     * returns configMerge stream
     * @return {Transform}
     */
    getConfigStream: function () {
        /**
         * stream that create config using getPageConfig function for each message
         * if there is the page config was loaded it sets isPageConfigLoaded to true
         * in order to prevent this message from second config load
         * 
         * @param  {{message: WorkerMessage, basePath: string, isPageConfigLoaded: boolean}}   data
         * @param  {Function} callback
         */
        return es.map(function (data, callback) {
            var message = data.message,
                basePath = data.basePath;

            if (data.isPageConfigLoaded) {
                return callback(null, data);
            }

            basePath = path.join(basePath, 'page');

            configMerge.getPageConfig(basePath, message.basedomain, message.page, function (err, config) {
                if (err) {
                    return callback(err);
                }

                var result = _.cloneDeep(data);
                result.config = config;
                result.isPageConfigLoaded = (message.page) ? true : false;

                callback(null, result);
            });
        });
    }
};