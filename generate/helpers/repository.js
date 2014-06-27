'use strict';

var path = require('path'),
    fs = require('fs'),
    grunt = require('grunt');

var baseHelper = require('./base'),
    Git = require('git-wrapper');


exports.create = function (config) {
    // fail if namespace folder is in git
    // create a repository from the namespace called "name"
    var namespace = config.namespace,
        git = new Git({}),
        done = this.async(),
        namespaceFolder = path.join(baseHelper.projectRoot, namespace);

    if (fs.existsSync(path.join(namespaceFolder, '.git'))) {
        grunt.log.error('Folder with namespace already is a git repository');
        return done();
    }

    git.exec('init', [namespaceFolder], function (err, res) {
        if (err) {
            grunt.log.error('Error happened while repo creation', err);
            return done();
        }
        grunt.log.writeln(res);
        grunt.log.writeln('Repository created!');
        done();
    });

};