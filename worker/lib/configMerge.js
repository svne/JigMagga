'use strict';

var async = require('async'),
    _ = require('lodash'),
    extend = require('deep-extend'),
    es = require('event-stream'),
    fs = require('fs'),
    path = require('path');


var configStorage = {};

var readConfig = function (path, callback) {
    if (configStorage[path]) {
        return process.nextTick(function () {
            callback(null, configStorage[path]);
        });
    }

    fs.readFile(path, function (err, result) {
        if (err) {
            if (err.code === 'ENOENT') {
                configStorage[path] = {};
                return callback(null, {});
            }

            return callback(err);
        }

        try {
            result = JSON.parse(result);
        } catch (e) {
            return callback('error while parsing config ' + path);
        }

        configStorage[path] = result;
        callback(null, result);
    });
};

module.exports = {
    /**
     * get list of config files that should be merged in order
     * to obtain merged config
     *
     * @param basePath
     * @param domain
     * @param page
     * @param callback
     * @return {*}
     */
    getConfigPaths: function (basePath, domain, page, callback) {
        var defaultDomainName = 'default',
            defaultPageConfigName = 'page.conf',
            configs;

        if(_.isFunction(page)) {
            callback = page;
            page = '';
        }

        var getPossibleConfigsForDomain = function (domain, page) {
            var fullPath = path.join(domain, page),
                currentPath = basePath;

            return fullPath.split('/').map(function (folder) {
                currentPath = path.join(currentPath, folder);
                return path.join(currentPath, folder + '.conf');
            });
        };

        configs = getPossibleConfigsForDomain(defaultDomainName, page)
            .concat(getPossibleConfigsForDomain(domain, page));

        configs.unshift(path.join(basePath, defaultPageConfigName));

        callback(null, configs);
    },

    /**
     * get the page conf and all configs that will above this page config
     * will be retrun extended object
     * @param basePath
     * @param domain
     * @param page
     * @param callback
     * @returns {{}}
     */
    getPageConfig: function (basePath, domain, page, callback) {

        if(_.isFunction(page)) {
            callback = page;
            page = '';
        }

        page = page || '';

        async.waterfall([
            this.getConfigPaths.bind(null, basePath, domain, page),
            function (configPaths, next) {

                async.reduce(configPaths, {}, function (extendedConfig, currentConfigPath, cb) {
                    readConfig(currentConfigPath, function (err, content) {
                        if (err) {
                            return cb(err);
                        }

                        var res = extend(extendedConfig, content);
                        cb(null, res);
                    });
                }, next);

            }
        ], callback);
    },

    getConfigStream: function () {
        var that = this;
        return es.map(function (data, callback) {
            var message = data.message,
                result,
                basePath = data.basePath;

            if (data.isPageConfigLoaded) {
                return callback(null, data);
            }

            basePath = path.join(basePath, 'page');

            that.getPageConfig(basePath, message.basedomain, message.page, function (err, config) {
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