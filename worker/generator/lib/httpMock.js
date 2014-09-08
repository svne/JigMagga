'use strict';
var http = require('http-get');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var config = require('../../config');

var pathToRegExp = function (path) {
    var regExpStr = path.replace(/\//g, '\\/').replace(/[\d]+/ig, '{[^}]+}');

    return new RegExp('^' + regExpStr + '$', 'i');
};

var getPathToFixture = function (uri, fixtures) {
    var uriRegExp = pathToRegExp(uri);

    var fixture = _.find(fixtures, function (item) {
        return uriRegExp.test(item.uri);
    });

    if (!fixture) {
        return null;
    }

    return path.join(__dirname, '../../..', fixture.data);
};

exports.get = function (options, callback) {
    var url = options.url,
        result = {},
        pathToFixture,
        fixtures = config.fixtures;

    if (!fixtures) {
        console.log('In order to use fixtures pleas create config file fixtures.json');
        return http.get(options, callback);
    }

    pathToFixture = getPathToFixture(options.apiCallDescriptor.path, fixtures);

    if (!pathToFixture) {
        console.log('Can not use fixtures there is no such fixture fixtures.json for request',
            options.apiCallDescriptor.path);
        return http.get(options, callback);
    }

    fs.readFile(pathToFixture, function (err, mock) {
        if (err) {
            if (err.code === 'ENOENT') {
                console.log('[mock] there is no mock for url', url);
                return http.get(options, callback);
            }
            return callback(err);
        }

        result.buffer = Buffer.isBuffer(mock) ? mock : new Buffer(mock);
        callback(null, result);
    });
};
