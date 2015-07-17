'use strict';

var util = require('util');
var _ = require('lodash');
var fs = require('fs');
var placeholderHelper = require("./placeholders.js");
var Q = require('q');
var http = require('http-get');
var deepExtend = require('deep-extend');
var querystring = require("querystring");

var diffToTime = require('../../lib/timeDiff').diffToTime;

var httpMock = require('./httpMock');

var useFixtures = function () {
    return process.argv.indexOf('-f') >= 0 || process.argv.indexOf('--fixtures') >= 0;
};

var http = (useFixtures()) ? httpMock : http;


var cachedCalls = {};
var requestSchemas = {};


var getRequestId = function (options) {
    return options.db + options.path + JSON.stringify(options.query).replace(/[^a-z0-9]/gi, "");
};

exports.clearCache = function () {
    cachedCalls = {};
};

exports.deleteCachedCall = function (apiMessageKey) {
    if (cachedCalls[apiMessageKey]) {
        delete cachedCalls[apiMessageKey];
    }

};


/**
 *
 * @param {String} schemaFile
 * @param {String} apiMessageKey
 * @param {Function} callback
 * @return {*}
 */
var getRequestSchema = function (schemaFile, callback) {
    if (requestSchemas && requestSchemas[schemaFile]) {
        return process.nextTick(function () {
            callback(null, requestSchemas[schemaFile]);
        });
    }

    fs.readFile(schemaFile, "utf-8", function (err, res) {
        if (err) {
            return callback(err);
        }

        requestSchemas = requestSchemas || {};

        requestSchemas[schemaFile] = JSON.parse(res);
        callback(null, requestSchemas[schemaFile]);
    });
};

exports.addCallAsync = function (apicall, config, paramsFromQueue, apiconfig, callback) {
    var pathObj = config.apicalls[apicall].path,
        path = "",
        placeHolders = placeholderHelper.getConfigPlaceholders(pathObj, paramsFromQueue);

    if (placeHolders) {
        pathObj = placeholderHelper.replaceConfigPlaceholders(pathObj, placeHolders);
    }
    if (typeof pathObj === "object") {
        for (var i = 0; path === "" && i < pathObj.length; i++) {
            if (!(pathObj[i].indexOf("{") >-1)) {
                path += pathObj[i];
            }
        }
        if (path === "") {
            return callback(null, {
                success: false,
                message: "failed to gather needed placeholder in path",
                path: "[" + pathObj.join(", ") + "]"
            });
        }
    } else {
        path += pathObj;
    }
    var url = util.format('http://%s:%s/%s/%s%s', apiconfig.hostname, apiconfig.port, apiconfig.base, apiconfig.version, path);

    var next = function (err, params, urlParams) {
        if (err) {
            return callback(err);
        }
        // generate container for api call
        var result = {
            db: apiconfig.db,
            language: params.language,
            path: url, // path to api call
            query: urlParams,
            success: true, // marker, that this call has not been failed
            result: null, // hold the returned data from api
            resultCode: 200,
            viewParam: apicall, // key in viewContainer to hold data
            apiMessageKey: apiconfig.apiMessageKey, // unique key for message
            apiCallDescriptor: config.apicalls[apicall]
        };
        callback(null, result);
    };

    if (config.apicalls[apicall].requestSchema === undefined) {
        return next(null, paramsFromQueue, {});
    }

    var schemaFile = config.apicalls[apicall].requestSchema.substr(2);


    getRequestSchema(schemaFile, function (err, paramsSchema) {
        if (err) {
            return next(err);
        }

        var urlParams = {};
        _.each(paramsSchema.properties, function (value, param) {
            if (paramsFromQueue[param] !== undefined) {
                urlParams[param] = paramsFromQueue[param];
            } else if (config.apicalls[apicall].defaults &&
                config.apicalls[apicall].defaults[param] != undefined) {

                if (config.apicalls[apicall].defaults[param] === "{pageNum}" && paramsFromQueue.pageNum) {
                    urlParams[param] = paramsFromQueue.pageNum;
                } else {
                    urlParams[param] = config.apicalls[apicall].defaults[param];
                }
            }

            if (!urlParams[param] && paramsSchema.required && paramsSchema.properties[param].required) {
                callback(null, {
                    success: false,
                    message: "failed to gather needed variable " + param,
                    path: url
                });
                return false;
            }
        });

        next(null, paramsFromQueue, urlParams);
    });


};


exports.addCall = function (apicall, config, paramsFromQueue, apiconfig) {
    var pathObj = config.apicalls[apicall].path,
        path = "",
        placeHolders = placeholderHelper.getConfigPlaceholders(pathObj, paramsFromQueue);


    if (placeHolders) {
        pathObj = placeholderHelper.replaceConfigPlaceholders(pathObj, placeHolders);
    }
    if (typeof pathObj === "object") {
        for (var i = 0; path === "" && i < pathObj.length; i++) {
            if (!(pathObj[i].indexOf("{") >-1)) {
                path += pathObj[i];
            }
        }
        if (path === "") {
            return {
                success: false,
                message: "failed to gather needed placeholder in path",
                path: "[" + pathObj.join(", ") + "]"
            };
        }
    } else {
        path += pathObj;
    }
    var url = util.format('http://%s:%s/%s/%s%s', apiconfig.hostname, apiconfig.port, apiconfig.base, apiconfig.version, path);

    // check if there is a schema in the config
    var paramsSchema = null;
    if (config.apicalls[apicall].requestSchema != undefined) {
        var schemaFile = config.apicalls[apicall].requestSchema.substr(2);
        paramsSchema = JSON.parse(fs.readFileSync(schemaFile, "utf-8"));
    }

    // we need some params
    var urlParams = {};
    if (paramsSchema != null) {
        for (var param in paramsSchema.properties) {
            if (paramsFromQueue.hasOwnProperty(param) && paramsFromQueue[param] !== undefined) {
                urlParams[param] = paramsFromQueue[param];
            } else if (config.apicalls[apicall].defaults
                && config.apicalls[apicall].defaults[param] != undefined) {
                if (config.apicalls[apicall].defaults[param] === "{pageNum}" && paramsFromQueue["pageNum"]) {
                    urlParams[param] = paramsFromQueue["pageNum"];
                } else {
                    urlParams[param] = config.apicalls[apicall].defaults[param];
                }
            }

            if (!urlParams[param] && paramsSchema.required == true && paramsSchema.properties[param].required == true) {
                return {
                    success: false,
                    message: "failed to gather needed variable " + param,
                    path: url
                };
            }
        }
    }
    // generate container for api call
    return {
        db: apiconfig.db,
        language: paramsFromQueue.language,
        path: url, // path to api call
        query: urlParams,
        success: true, // marker, that this call has not been failed
        result: null, // hold the returned data from api
        resultCode: 200,
        viewParam: apicall, // key in viewContainer to hold data
        apiMessageKey: apiconfig.apiMessageKey, // unique key for message
        apiCallDescriptor: config.apicalls[apicall]
    };
};

exports.doCall = function (options, callback) {
    var requestId;
    if (options.success === false) {
        return callback(null, options);
    }
    requestId = getRequestId(options);
    var messageKey = options.apiMessageKey;

    if (!cachedCalls[messageKey]) {
        cachedCalls[messageKey] = {};
    }

    if (cachedCalls[messageKey][requestId]) {
        return cachedCalls[messageKey][requestId].promise.done(function(result) {
            result.requestId = result.requestId || requestId;
            var res = deepExtend({}, result);
            res.fromCache = true;
            callback(null, res);
        });
    }

    cachedCalls[messageKey][requestId] = Q.defer();
    var query = (options.query && Object.keys(options.query).length) ? "?" + querystring.stringify(options.query) : "";

    var getOptions = {
        url: options.path + query,
        bufferType: "buffer",
        headers: { "YD-X-Domain": options.db, "Accept-Language": options.language, 'User-Agent': 'ydFrontend_Worker' }
    };
    if (useFixtures()) {
        getOptions.apiCallDescriptor = options.apiCallDescriptor;
    }
    var diff = process.hrtime();
    http.get(getOptions, function (error, result) {
        if (result) {
            try {
                options.result = JSON.parse(result.buffer.toString());
                options.time = diffToTime(process.hrtime(diff));
                options.success = true;
                cachedCalls[messageKey][requestId].resolve(options);
            }
            catch (err) {
                if (useFixtures()) {
                }
                options.success = false;
                options.error = err;

                cachedCalls[messageKey][requestId].resolve(options);
            }
        } else {
            options.resultCode = (error && error.code) ? error.code : error;
            options.error = error;
            options.success = false;
            cachedCalls[messageKey][requestId].resolve(options);
        }
    });
    cachedCalls[messageKey][requestId].promise.done(function(result) {
        result.requestId = result.requestId || requestId;
        var res = deepExtend({}, result);
        callback(null, res);
    });


};