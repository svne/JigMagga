'use strict';

// put namespace into .gitignore
// create folder with the name namespace
// inside create folder "page"
// inside "page" create a conf json file with the parameter "namespace" set to namespace (like in templates)
// create a domain "default" (call this.domain(namespace, "default"))
// inside "default" create a page called "index" (call this.page(namespace, "index", "default"))


var path = require('path'),
    fs = require('fs'),
    grunt = require('grunt'),
    _ = require('lodash'),
    async = require('async');

var baseHelper = require('./base'),
    pageHelper = require('./page'),
    fsExtra = require('../fsExtra');

var getTplPath = baseHelper.getTplPath;
var projectRoot = baseHelper.projectRoot;



exports.create = function (config) {
    var namespace = config.namespace,
        destinationPath = path.join(projectRoot, namespace),
        done = this.async();

    if (fs.existsSync(destinationPath)) {
        grunt.log.error('Folder with namespace already exists');
        return;
    }

    async.series([
        function (next) {
            var gitignore = path.join(projectRoot, '.gitignore'),
                lastIsNewLine = new RegExp('\\n$', 'i');
            fsExtra.editFile(gitignore, function (data) {
                if (!lastIsNewLine.test(data)) {
                    data += '\n';
                }
                return data + namespace + '\n';
            }, next);
        },
        function (next) {
            fs.mkdir(destinationPath, next);
        },
        function (next) {
            var tplPath = getTplPath('project'),
                params = baseHelper.getPlaceholders({
                    namespace: namespace,
                    domain: '<%= domain %>' // add domain in order to render media config file
                });

            fsExtra.copy(tplPath, destinationPath, params, next);
        },
        function (next) {
            fs.mkdir(path.join(destinationPath, 'page', 'default'), next);
        },
        function (next) {
            pageHelper.create({
                namespace: namespace,
                name: 'index',
                domain: 'default'
            }, next);
        }
    ], function (err) {
        if (err) {
            grunt.log.error('Error happened while project creation', err);
            return done();
        }
        grunt.log.writeln('Project created!');
        done();
    });
};
