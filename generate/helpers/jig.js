'use strict';
// fail if the jig exists in "jig"
// create a folder called "jig" in the namespace if it doesn't exists
// create jig by template in "jig"
// creaate jig section in page/<domain>/<domainLast>.conf
// create a HTML section in page".html" with the class ".namespace-jig-name" and put it inside the body of the HTML page
// insert config for the jig into the config
// example:
// "<%= namespace %>-jig-<%= name %>": {
//      "controller": "<%= Namespace %>.Jig.<%= Name %>",  // notice the uppercase namespace!
//      "template": "<%= namespace %>/jig/<%= name %>/views/init.mustache",
//      "options": {},
//      "render": true,
//      "prerender": true
// }


var path = require('path'),
    fs = require('fs'),
    grunt = require('grunt'),
    _ = require('lodash'),
    async = require('async'),
    cheerio = require('cheerio'),
    format = require('util').format;

var baseHelper = require('./base'),
    fsExtra = require('../fsExtra'),
    walker = require('../walker');

var getTplPath = baseHelper.getTplPath;
var projectRoot = baseHelper.projectRoot;

walker = walker(projectRoot, {});

var insertJigSectionInPage = exports.insertJigSectionInPage = function (pagePath, namespace, jigClasses, callback) {

    var classToInsert = format('.%s-content-inner', namespace),
        tag;

    jigClasses = _.isArray(jigClasses) ? jigClasses : [jigClasses];
    tag = jigClasses.reduce(function (result, jigClass) {
        // remove the leading '.' from jigClass when placing the class name in html
        return result + format('\n                <section class="%s"></section>', jigClass.substring(1));
    }, '');

    walker.forEachPageInPath(pagePath, function (fileName, pathToFile, cb) {
        fsExtra.editFile(path.join(pathToFile, fileName), function (data) {
            var $ = cheerio.load(data);
            $(classToInsert).prepend(tag);
            return $.html();
        }, cb);
    }, callback);
};


exports.create = function (config) {

    var namespace = config.namespace,
        name = config.name,
        pathToConfig = config.domain,
        pathToFolder = path.join(config.domain, '..'),
        parent = (config.slotParent === '') ? null : config.slotParent,
        done = this.async(),
        tplPath = getTplPath('jig'),
        jigFolderPath = path.join(projectRoot, namespace, 'jig'),
        jigClass,
        jigPath,
        params;

    jigClass = format('.%s-jig-%s', config.namespace, config.name);
    jigPath = path.join(jigFolderPath, name);
    if (fs.existsSync(jigPath)) {
        grunt.log.error('Such jig already exists in namespace');
        return done();
    }

    params = baseHelper.getPlaceholders({name: name, namespace: namespace});

    async.series([
        _.curry(fsExtra.createFolderIfNotExists)(jigFolderPath),
        _.curry(fsExtra.createFolderIfNotExists)(jigPath),
        _.curry(fsExtra.copy)(tplPath, jigPath, params),
        function (next) {
            if(config.domain === "none"){
                return next();
            }
            fsExtra.editConfigFile(pathToConfig, function (data) {
                data.jigs = data.jigs || {};

                data.jigs[jigClass] = {
                    "controller": format('%s.Jig.%s', params.Namespace, params.Name),
                    "template": format('%s/jig/%s/views/init.mustache',params.namespace, params.name),
                    "options": {},
                    "render": true,
                    "prerender": true

                };
                if (parent) {
                    data.jigs[jigClass].slot = {
                        parent: parent,
                        classes: []
                    };
                }
                return data;
            }, next);
        },
        function (next) {
            if (parent || config.domain === "none") {
                return next();
            }

            insertJigSectionInPage(pathToFolder, namespace, jigClass, next);
        }
    ], function (err) {
        if (err) {
            grunt.log.error('Error happened while jig creation', err);
            return done(err);
        }
        grunt.log.writeln('Jig created!');
        done();
    });
};