'use strict';

var util = require('util');
var fs = require('fs');
var placeholderHelper = require("./placeholders.js");
var Q = require('q');
var deepExtend = require("deep-extend");
var http = require('http-get');
var querystring = require("querystring");

var httpMock = require('./httpMock');

var http = (process.env.NODE_ENV === 'local') ? httpMock : http;

var cachedCalls = {};

var getRequestId = function (options) {
    return options.db + options.path + JSON.stringify(options.query).replace(/[^a-z0-9]/gi, "");
}

exports.clearCache = function () {
    cachedCalls = {};
};

exports.deleteCachedCall = function (apiMessageKey) {
    if (cachedCalls[apiMessageKey]) {
        delete cachedCalls[apiMessageKey];
    }
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
        db: apiconfig["db"],
        language: paramsFromQueue.language,
        path: url, // path to api call
        query: urlParams,
        success: true, // marker, that this call has not been failed
        result: null, // hold the returned data from api
        resultCode: 200,
        viewParam: apicall, // key in viewContainer to hold data
        apiMessageKey: apiconfig.apiMessageKey // unique key for message
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
            callback(null, result);
        });
    }

    cachedCalls[messageKey][requestId] = Q.defer();
    var getOptions = {
        url: options.path + (options.query ? "?" + querystring.stringify(options.query) : ""),
        bufferType: "buffer",
        headers: { "YD-X-Domain": options.db, "Accept-Language": options.language, 'User-Agent': 'ydFrontend_Worker' }
    };
    http.get(getOptions, function (error, result) {

        if (result) {
            try {
                options.result = JSON.parse(result.buffer.toString());
                options.success = true;
                cachedCalls[messageKey][requestId].resolve(deepExtend({},options));
            }
            catch (err) {
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
        callback(null, result);
    });


};