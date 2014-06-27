'use strict';

// fail if the locale/domain exists in namespace or if the domain doesn't exists
// create a folder in namespace called "locales" if it doesn't exist
// create a folder in locales called domain if it doesn't exist
// inside namespace/"page"/domain/domain".conf" add the key "locales" if it doesn't exists and inside the array of locales add the locale
// example: "locales": ["de_DE", "en_EN"]
// inside create a header.po and a messages.po with the same content having "locale" set to locale, see template


var path = require('path'),
    fs = require('fs'),
    grunt = require('grunt'),
    format = require('util').format,
    _ = require('lodash'),
    async = require('async');

var baseHelper = require('./base'),
    fsExtra = require('../fsExtra');

var getTplPath = baseHelper.getTplPath;
var projectRoot = baseHelper.projectRoot;

var addLocaleToPages = function (config, locale) {
    if (!_.isPlainObject(config.pages) || !Object.keys(config.pages).length) {
        return config;
    }

    var mainLocale = config['init-locale'] || _.first(config.locales),
        language = _.first(locale.split('_'));

    _.each(config.pages, function (page, name) {
        config.pages[name][locale] = format('/%s%s', language, config.pages[name][mainLocale]);
    });

    return config;
};


exports.create = function (config, callback) {
    var namespace = config.namespace,
        name = config.name,
        domains = config.domain,
        done = callback || this.async(),
        domain,
        localePath,
        tplPath,
        params;

    domains = _.isString(domains) ? JSON.parse(domains) : domains;
    domain = _.find(domains, function (item) {
        return item.name === _.last(item.value.split('/'));
    });
    localePath = path.join(projectRoot, namespace, 'locales');

    tplPath = getTplPath('locale', 'locales');
    params = baseHelper.getPlaceholders({
        namespace: namespace,
        name: name,
        domain: domain.name
    });

    async.series([
        _.curry(fsExtra.createFolderIfNotExists)(localePath),
        function (next) {
            if (fs.existsSync(path.join(localePath, domain.name, name)) ||
                !fs.existsSync(domain.value)) {
                grunt.log.error('Such locale already exists in namespace or domain does not exists');
                return done();
            }
            return next();
        },
        _.curry(fsExtra.copy)(tplPath, localePath, params),
        function (next) {
            async.each(domains, function (item, cb) {
                var itemName = _.last(item.value.split('/')),
                    itemConfig = path.join(item.value, itemName + '.conf');

                fsExtra.editConfigFile(itemConfig, function (data) {
                    data.locales = data.locales || [];
                    if (data.locales.indexOf(name) < 0) {
                        data.locales.push(name);
                    }
                    data = addLocaleToPages(data, name);
                    return data;
                }, cb);
            }, next);
        }

    ], function (err) {
        if (err) {
            grunt.log.error('Error happened while local creation', err);
            return done(err);
        }
        grunt.log.writeln('Locale created!');
        done();
    });

};