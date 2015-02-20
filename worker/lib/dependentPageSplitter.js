'use strict';
var streamHelper = require('./streamHelper');
var WorkerError = require('./error').WorkerError;
var STATUS_CODES = require('./error').STATUS_CODES;
var async = require('async');
var configMerge = require('./configMerge');
var format = require('util').format;
var _ = require('lodash');
var request = require('request');


var grepDependentPages = function (config) {
    var result = [];
    _.each(config.jigs, function (jig) {
        if (!jig.apicalls) {
            return;
        }

        _.each(jig.apicalls, function (apicall) {
            if (apicall.buildDependentPages) {
                result.push(apicall.buildDependentPages);
            }
        });
    });

    return result;
};

var doApiCall = function (path, config, apiconfig, callback) {

    var domain = config.domain,
        version = config.version;

    var url = format('http://%s:%s/%s/%s%s',
        apiconfig.hostname, apiconfig.port, apiconfig.base, version, path);

    var headers = {
        'accept_language': 'de-DE,de;q=0.8,en-US;q=0.6,en;q=0.4',
        'user_agent': 'ydFrontend_Worker',
        'yd-x-domain': domain
    };

    request.get(url, {headers: headers, json: true}, callback);
};

var replacePlaceholders = function (item, context, interpolate) {

    return _.template(item, context, {interpolate: interpolate});
};

var generateMessageList = function (body, data, dependentPage) {

    var result = [data];

    var itemList = _.map(body, function (item) {
        var res = _.cloneDeep(data);
        res.isPageConfigLoaded = false;

        _.each(dependentPage.map, function (name, value) {
            res.message[value] = replacePlaceholders(name, item, /{{([\s\S]+?)}}/g);
        });
        return res;

    });

    return result.concat(itemList);
};


//module.exports = function (globalConfig) {
//
//    return es.through(function (data) {
//        var config = data.config,
//            message = data.message;
//
//        var that = this;
//        var dependentPages = grepDependentPages(config);
//
//        if (!dependentPages.length) {
//            return this.emit('data', data);
//        }
//
//        var dependentPage = _.first(dependentPages);
//        var path = replacePlaceholders(dependentPage.path, message, /{([\s\S]+?)}/g);
//
//        doApiCall(path, config, globalConfig.api, function (err, res, body) {
//
//            if (err || res.statusCode >= 400) {
//                this.emit('err', err || body);
//            }
//
//            var messageList = generateMessageList(body, data, dependentPage);
//
//
//            async.forEachSeries(messageList, function (item, cb) {
//                configMerge.getConfig(item, function (err, res) {
//                    if (err) {
//                        that.emit('err', err);
//                        return cb();
//                    }
//
//                    that.emit('data', res);
//                    cb();
//                });
//            });
//        });
//    });
//};

module.exports = function (globalConfig) {

    return streamHelper.asyncThrough(function (data, push, callback) {
        var config = data.config,
            message = data.message;

        var dependentPages = grepDependentPages(config);

        if (!dependentPages.length) {
            push(null, data);
            return callback();
        }

        var dependentPage = _.first(dependentPages);
        var path = replacePlaceholders(dependentPage.path, message, /{([\s\S]+?)}/g);

        doApiCall(path, config, globalConfig.api, function (err, res, body) {

            if (err || res.statusCode >= 400) {

                push(new WorkerError(err || body, data.message, null, STATUS_CODES.API_ERROR));
                return callback();
            }

            var messageList = generateMessageList(body, data, dependentPage);


            async.forEachSeries(messageList, function (item, cb) {
                configMerge.getConfig(item, function (err, res) {
                    if (err) {
                        return cb(err);
                    }

                    push(null, res);
                    cb();
                });
            }, function (err) {
                if (err) {
                    push(new WorkerError(err, data.message, null, STATUS_CODES.WRONG_ARGUMENT_ERROR));
                }
                callback();
            });
        });
    });
};
