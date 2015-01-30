'use strict';

// fail if the model exists in "models"
// create a folder called "models" in the namespace
// create a folder called fixture in the namespae
// create a model by template in "models"
// inside fixture create "fixtures.js" by template
// add this to the page.conf includes (create includes if not available):
// "includes": [{ "id": "//<%= namespace %>/fixture/fixtures.js", "ignore" : true}],


var path = require('path'),
    fs = require('fs'),
    grunt = require('grunt'),
    _ = require('lodash'),
    async = require('async');

var baseHelper = require('./base'),
    walker = require('../walker'),
    fsExtra = require('../fsExtra');

var getTplPath = baseHelper.getTplPath;
var projectRoot = baseHelper.projectRoot;

walker = walker(projectRoot, {});


exports.create = function (config) {
    console.log(config);

    var namespace = config.namespace,
        name = config.name,
        done = this.async(),
        tplPath = getTplPath('model', 'models'),
        modelsPath = path.join(projectRoot, namespace, 'models'),
        fixturesPath = path.join(projectRoot, namespace, 'fixture'),
        params;

    if (fs.existsSync(path.join(modelsPath, name))) {
        grunt.log.error('Such model already exists in namespace');
        return done();
    }

    params = baseHelper.getPlaceholders({
        namespace: namespace,
        name: name,
        appPath: '/' + namespace
    });

    var isFixtureExisted = false;

    async.series([
        _.curry(fsExtra.createFolderIfNotExists)(modelsPath),
        _.curry(fsExtra.createFolderIfNotExists)(fixturesPath),
        _.curry(fsExtra.copy)(tplPath, modelsPath, params),
        function (next) {
            fs.exists(path.join(fixturesPath, 'fixtures.js'), function (result) {
                if (result) {
                    isFixtureExisted = true;
                    return next();
                }
                var fixtureTpl = path.join(tplPath, '..', 'fixture');
                fsExtra.copy(fixtureTpl, fixturesPath, params, next);
            });
        },
        function (next) {
            if (isFixtureExisted) {
                return next();
            }
            walker.forEachDomain(namespace, function (folder, root, cb) {
                fsExtra.editConfigFile(path.join(root, folder + '.conf'), function (data) {
                    if (data.includes) {
                        return false;
                    }

                    data.includes = [{ "id": "//" + namespace +"/fixture/fixtures.js", "ignore" : true}];
                    return data;
                }, cb);
            }, next);
        }
    ], function (err) {
        if (err) {
            grunt.log.error('Error happened while model creation', err);
            return done(err);
        }
        grunt.log.writeln('Model created!');
        done();
    });
};