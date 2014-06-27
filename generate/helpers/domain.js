'use strict';
// fail if the domain name exists in locale and in page
// create a folder called name in "page"
// create a conf file in "page"/domain as the template


var path = require('path'),
    fs = require('fs'),
    grunt = require('grunt'),
    _ = require('lodash'),
    async = require('async');

var baseHelper = require('./base'),
    localeHelper = require('./locale'),
    fsExtra = require('../fsExtra');


var getTplPath = baseHelper.getTplPath;
var projectRoot = baseHelper.projectRoot;


exports.create = function (config) {
    var namespace = config.namespace,
        name = config.name,
        locale = config.locale,
        done = this.async(),
        tplPath = getTplPath('domain', 'page'),
        params = baseHelper.getPlaceholders({name: name, namespace: namespace}),
        pagePath = path.join(projectRoot, namespace, 'page'),
        domainPath = path.join(projectRoot, namespace, 'page', name);

    if (fs.existsSync(domainPath)) {
        grunt.log.error('Such domain already exists in namespace');
        return done();
    }
    async.series([
        _.curry(fsExtra.copy)(tplPath, pagePath, params),
        function (next) {
            var domains = [{name: name, value: domainPath}];
            localeHelper.create({
                namespace: namespace,
                name: locale,
                domain: domains
            }, next);
        }
    ], function (err) {
        if (err) {
            grunt.log.error('Error happened while domain creation', err);
            return done(err);
        }
        grunt.log.writeln('Domain created!');
        done();
    });
};