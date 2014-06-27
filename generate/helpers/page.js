'use strict';

// fail if the page/domain/page exists in namespace
// create page by template in namespace/"page"/domain
// remember that the name can contain slashes = folders
// insert page in "pages" object in domain".conf" with the currently available locales
// examples:
// "agb": {"de_DE": "/agb", "en_EN": "/en/agb"} -> put in the locales in the given order, put the language part of the locale in front of the pagename as a path, but dont do that for the main locale
// "index": {"de_DE": "/", "en_EN": "/en/"} -> if the pagename is "index" strip the pagename out of the path


var path = require('path'),
    fs = require('fs'),
    grunt = require('grunt'),
    _ = require('lodash'),
    async = require('async');

var baseHelper = require('./base'),
    jigHelper = require('./jig'),
    fsExtra = require('../fsExtra');

var getTplPath = baseHelper.getTplPath;
var projectRoot = baseHelper.projectRoot;


/**
 * search for locale on parent config file
 * @param {string} domainPath
 * @return {array}
 */
var getLocaleForParentDomain = function (domainPath) {
    domainPath = domainPath.split('/');
    domainPath.pop();

    var domainName = _.last(domainPath),
        parentDomainPath = domainPath.join('/'),
        parentDomainConfig;

    parentDomainConfig = fs.readFileSync(path.join(parentDomainPath, domainName + '.conf'));
    parentDomainConfig = JSON.parse(parentDomainConfig.toString());

    return parentDomainConfig.locales;
};


var insertLocaleInPageConf = function (config, name, domainPath) {
    var locales = config.locales || getLocaleForParentDomain(domainPath),
        initLocale;

    if (!locales) {
        throw new Error('You do not have an locale in current or parent domain');
    }

    initLocale = config['init-locale'] || _.first(locales);
    config.pages = config.pages || {};
    config.pages[name] = {};
    locales.forEach(function (locale) {
        var localeLanguage = _.first(locale.split('_')),
            path;

        if (locale === initLocale) {
            path = '/' + name;
        } else {
            path = '/' + localeLanguage + '/' + name;
        }

        path = path.replace(/index$/i, '');
        config.pages[name][locale] = path;
    });
    return config;
};

var getExistingJigs = function (namespace, domainConfigPath, callback) {
    var domainConfigFileName = _.last(domainConfigPath.split(path.sep)),
        mainPageConfigPath = path.join(projectRoot, namespace, 'page', 'page.conf'),
        tasks = [];

    tasks.push(_.curry(fsExtra.getConfig)(mainPageConfigPath));

    if (domainConfigFileName !== 'default.conf') {
        tasks.push(_.curry(fsExtra.getConfig)(domainConfigPath));
    }

    async.parallel(tasks, function (err, res) {
        if (err) {
            return callback(err);
        }

        var result = res.reduce(function (cumulativeValue, config) {
            return _.assign(cumulativeValue, config.jigs || {});
        }, {});
        callback(null, result);
    });

};


exports.create = function (config, callback) {
    var namespace = config.namespace,
        name = config.name,
        domainPath = config.domain === 'default' ?
            path.join(projectRoot, config.namespace , 'page', 'default') : config.domain,

        done = callback || this.async(),
        domainName = _.last(domainPath.split('/')),
        domainConfig = path.join(domainPath, domainName + '.conf'),

        destinationPath,
        tplPath = getTplPath('page'),
        existingJigClasses = [],
        params;

    params = baseHelper.getPlaceholders({
        namespace: namespace,
        name: name,
        path: name,
        domain: domainName
    });
    destinationPath = path.join(domainPath, name);


    async.series([
        _.curry(fsExtra.createPath)(domainPath, name),
        _.curry(fsExtra.copy)(tplPath, destinationPath, params),
        function (next) {
            if (!fs.existsSync(domainConfig)) {
                return next();
            }
            fsExtra.editConfigFile(domainConfig, function (config) {
                return insertLocaleInPageConf(config, name, domainPath);
            }, next);
        },
        function (next) {
            getExistingJigs(namespace, domainConfig, function (err, res) {
                if (err) {
                    return next(err);
                }
                _.each(res, function (jig, key) {
                    if (!_.isPlainObject(jig.slot)) {
                        existingJigClasses.push(key);
                    }
                });
                next();
            });
        },
        function (next) {
            if (!existingJigClasses.length) {
                return next();
            }
            jigHelper.insertJigSectionInPage(destinationPath, namespace, existingJigClasses, next);
        }
    ], function (err) {
        if (err) {
            grunt.log.error('Error happened while page creation', err);
            return done(err);
        }
        grunt.log.writeln('Page created!');
        done();
    });
};