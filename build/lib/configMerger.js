'use strict';


var jmUtil = require('jmUtil'),
    es = require('event-stream'),
    path = require('path'),
    konphyg = require('konphyg'),
    async = require('async'),
    util = require('util');


function callPageConfigUtil() {
    return es.map(function (data, callback) {
        if (!data.build.basePath) {
            throw new Error("There is no basepath");
        }
        if (!data.build.domain) {
            throw new Error("There are no domain settings");
        }
        jmUtil.configMerge.getPageConfig(data.build.basePath, data.build.domain, data.build.page, function (err, result) {
            data.data = result;
            callback(null, data);
        });
    });
}

var projectConfigStore = {};


module.exports = {


    /**
     *
     * @param basePath
     * @param domain
     * @returns {*}
     */
    getConfig: function () {
        return callPageConfigUtil();
    },

    /**
     *
     * @param basePath
     * @param domain
     * @returns {*}
     */
    getConfigFromPageItem: function (page, basePath, domain, cb) {

        jmUtil.configMerge.getPageConfig(basePath, domain, page, function (err, result) {
            cb(null, result);
        });

    },

    /**
     *
     * @param page
     * @returns {*}
     */
    getPagesThatMatchThePageParam: function () {
        return es.map(function (data, callback) {
            var regex = new RegExp("^" + data.build.page + "$");
            var locale = data.data.locales[0];
            var filteredPages = Object.keys(data.data.pages).filter(function (item) {
                if (item && item.search(regex) !== -1 && data.data.pages[item][locale].indexOf('http://') === -1) {
                    return true;
                }
            });
            if (!filteredPages.length) {
                throw new Error("No page found with pattern: " + regex);
            }
            data.build.pages = filteredPages;
            data.build.pagesRegex = regex;
            callback(null, data);
        });
    },
    /**
     * this fn iterate over all build.pages in a stream and will return a stream that include an array with all pages configurations
     * @param basePath
     * @param domain
     */
    getAllMergedConfigsFromPages: function () {
        var self = this;
        return es.map(function (data, callback) {
            if (!data.build || !data.build.basePath || !data.build.domain) {
                throw new Error("Stream need build object with {basePath: \"\", domain: \"\"} ");
            }
            async.mapLimit(data.build.pages, 1, function (item, cb) {
                self.getConfigFromPageItem(item, data.build.basePath, data.build.domain, function (err, result) {
                    result.build = util._extend({}, data.build);
                    result.build.page = item;
                    cb(null, result);
                });
            }, function (err, results) {
                callback(err, results);
            });
        });
    },

    /**
     * obtains a project config by namespace and cash it in the scope
     *
     * @param {string} namespace
     * @return {object}
     */
    getProjectConfig: function (namespace) {
        if (projectConfigStore[namespace]) {
            return projectConfigStore[namespace];
        }
        var pathToConfig = path.join(__dirname, '../..', namespace, 'config');
        var config = konphyg(pathToConfig);

        projectConfigStore[namespace] = config.all();
        return projectConfigStore[namespace];
    }
};