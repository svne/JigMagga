'use strict';

var fs = require('fs');
var _ = require('lodash');
var path = require('path');



exports.projectRoot = path.join(__dirname, '..', '..');
var templatesPath = exports.templatesPath = path.join(__dirname, '..', 'templates');

var capitalizeFirst = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

/**
 * general placeholders:
 * placeholders are the three variables "namespace", "name" and "page"
 * the placeholders "namespace" and "name" also exist in the uppercase form of the first letter "Namespace", "Name"
 * "page" and "name" can contain slashes (folders). To get the parts of the folders we have f.e. "nameFirst" (first folder), "nameLast" (last folder), "nameEnd" (all without fist folder). same for "page"
 * returns a list of parameters
 * for templates
 * @param {object} data
 * @return {*}
 */
exports.getPlaceholders = function (data) {

    var placeholders = data;

    if (data.namespace) {
        placeholders.Namespace = capitalizeFirst(data.namespace);
    }

    if (data.name) {
        placeholders.Name = capitalizeFirst(data.name);
    }

    if (data.path) {
        placeholders.nameLast = _.last(data.path.split('/'));
    }

    if (data.fullName) {
        placeholders.FullName = data.fullName.map(capitalizeFirst);
    }

    return placeholders;
};

exports.getTplPath = function () {
    var args = _.toArray(arguments);

    args.unshift(templatesPath);

    return path.join.apply(path, args);
};