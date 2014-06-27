'use strict';

var path = require('path'),
    fs = require('fs'),
    grunt = require('grunt'),
    _ = require('lodash'),
    async = require('async');

var baseHelper = require('./base'),
    fsExtra = require('../fsExtra');

var getTplPath = baseHelper.getTplPath;

exports.create = function (config) {
    var namespace = config.namespace,
        name = config.name,
        domain = config.domain,

        done = this.async(),
        tplPath = getTplPath('domain', 'page'),
        params = baseHelper.getPlaceholders({name: name, namespace: namespace, subdomain: true}),
        domainPath = path.join(domain, name);

    if (fs.existsSync(domainPath)) {
        grunt.log.error('Such subdomain already exists in domain');
        return done();
    }
    async.series([
        _.curry(fsExtra.copy)(tplPath, domain, params)
    ], function (err) {
        if (err) {
            grunt.log.error('Error happened while domain creation', err);
            return done(err);
        }
        grunt.log.writeln('Domain created!');
    });

};