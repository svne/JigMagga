'use strict';

var path = require('path'),
    async = require('async'),
    grunt = require('grunt'),
    _ = require('lodash'),
    format = require('util').format,
    fs = require('fs');

var projectRoot = path.join(__dirname, '..');
var templatesPath = path.join(__dirname, 'templates');

var fsExtra = require('./fsExtra');
var config = require('../grunt.config');
var walker = require('./walker')(projectRoot , {filters: config.coreFolders});

var capitalizeFirst = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

/**
 * returns a list of parameters
 * for templates
 * @param {object} data
 * @return {*}
 */
var getPlaceholders = function (data) {

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

    return placeholders;
};

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

/**
 * insert locale in the domain config
 * @param {string} config
 * @param {string} name
 * @param {string} domainPath
 * @return {array}
 */
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



var generator = module.exports = {
    // general placeholders:
    // placeholders are the three variables "namespace", "name" and "page"
    // the placeholders "namespace" and "name" also exist in the uppercase form of the first letter "Namespace", "Name"
    // "page" and "name" can contain slashes (folders). To get the parts of the folders we have f.e. "nameFirst" (first folder), "nameLast" (last folder), "nameEnd" (all without fist folder). same for "page"
    project: function (namespace) {

        // put namespace into .gitignore
        // create folder with the name namespace
        // inside create folder "page"
        // inside "page" create a conf json file with the parameter "namespace" set to namespace (like in templates)
        // create a domain "default" (call this.domain(namespace, "default"))
        // inside "default" create a page called "index" (call this.page(namespace, "index", "default"))


        var destinationPath = path.join(projectRoot, namespace),
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
                fs.mkdir(path.join(projectRoot, namespace), next);
            },
            function (next) {
                var tplPath = templatesPath + '/project',
                    destination = projectRoot + '/' + namespace,
                    params = getPlaceholders({namespace: namespace});

                fsExtra.copy(tplPath, destination, params, next);
            },
            function (next) {
                generator.page(namespace, 'index', 'default', next);
            }
        ], function (err) {
            if (err) {
                grunt.log.error('Error happened while project creation', err);
                return done();
            }
            grunt.log.writeln('Project created!');
        });


    },
    repository: function (namespace, name) {
        // TODO: fail if namespace folder is in git
        // create a repository from the namespace called "name"
        console.log(namespace, name);
    },
    domain: function (namespace, name, locale) {
        var done = this.async(),
            tplPath = path.join(templatesPath, 'domain', 'page'),
            params = getPlaceholders({name: name, namespace: namespace}),
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
                generator.locale(namespace, locale, domains, next);
            }
        ], function (err) {
            if (err) {
                grunt.log.error('Error happened while domain creation', err);
                return done(err);
            }
            grunt.log.writeln('Domain created!');
        });

        // fail if the domain name exists in locale and in page
        // create a folder called name in "page"
        // create a conf file in "page"/domain as the template
    },
    locale: function (namespace, name, domains, callback) {

        var done = callback || this.async(),
            domain,
            localePath,
            tplPath,
            params;

        // fail if the locale/domain exists in namespace or if the domain doesn't exists
        // create a folder in namespace called "locales" if it doesn't exist
        // create a folder in locales called domain if it doesn't exist
        // inside namespace/"page"/domain/domain".conf" add the key "locales" if it doesn't exists and inside the array of locales add the locale
        // example: "locales": ["de_DE", "en_EN"]
        // inside create a header.po and a messages.po with the same content having "locale" set to locale, see template
        domains = _.isString(domains) ? JSON.parse(domains) : domains;
        domain = _.find(domains, function (item) {
            return item.name === _.last(item.value.split('/'));
        });
        localePath = path.join(projectRoot, namespace, 'locales');

        tplPath = path.join(templatesPath, 'locale', 'locales');
        params = getPlaceholders({
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
        });
    },
    page: function (namespace, name, domainPath, callback) {
        // fail if the page/domain/page exists in namespace
        // create page by template in namespace/"page"/domain
        // remember that the name can contain slashes = folders
        // insert page in "pages" object in domain".conf" with the currently available locales
        // examples:
        // "agb": {"de_DE": "/agb", "en_EN": "/en/agb"} -> put in the locales in the given order, put the language part of the locale in front of the pagename as a path, but dont do that for the main locale
        // "index": {"de_DE": "/", "en_EN": "/en/"} -> if the pagename is "index" strip the pagename out of the path

        domainPath = domainPath === 'default' ? path.join(projectRoot, namespace , 'page', 'default') : domainPath;

        var done = callback || this.async(),
            domainName = _.last(domainPath.split('/')),
            destinationPath,
            tplPath = path.join(templatesPath, 'page'),
            params;

            params = getPlaceholders({
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
                    var domainConfig = path.join(domainPath, domainName + '.conf');
                    if (!fs.existsSync(domainConfig)) {
                        return next();
                    }
                    fsExtra.editConfigFile(domainConfig, function (config) {
                        return insertLocaleInPageConf(config, name, domainPath);
                    }, next);
                }
            ], function (err) {
                if (err) {
                    grunt.log.error('Error happened while page creation', err);
                    return done(err);
                }
                grunt.log.writeln('Page created!');
                done();
            });
    },
    model: function (namespace, name) {
        // fail if the model exists in "models"
        // create a folder called "models" in the namespace
        // create a folder called fixture in the namespae
        // create a model by template in "models"
        // inside fixture create "fixtures.js" by template
        // add this to the page.conf includes (create includes if not available):
        // "includes": [{ "id": "//<%= namespace %>/fixture/fixtures.js", "ignore" : true}],
        var done = this.async(),
            tplPath = path.join(templatesPath, 'model', 'models'),
            modelsPath = path.join(projectRoot, namespace, 'models'),
            fixturesPath = path.join(projectRoot, namespace, 'fixture'),
            params;

        if (fs.existsSync(path.join(modelsPath, name))) {
            grunt.log.error('Such model already exists in namespace');
            return done();
        }

        params = getPlaceholders({
            namespace: namespace,
            name: name,
            appPath: '/' + namespace
        });

        async.series([
            _.curry(fsExtra.createFolderIfNotExists)(modelsPath),
            _.curry(fsExtra.createFolderIfNotExists)(fixturesPath),
            _.curry(fsExtra.copy)(tplPath, modelsPath, params),
            function (next) {
                fs.exists(path.join(fixturesPath, 'fixtures.js'), function (result) {
                    if (result) {
                        return next();
                    }
                    var fixtureTpl = path.join(tplPath, '..', 'fixture');
                    fsExtra.copy(fixtureTpl, fixturesPath, params, next);
                });
            },
            function (next) {
                walker.forEachDomain(namespace, function (folder, root, cb) {
                    fsExtra.editConfigFile(path.join(root, folder + '.conf'), function (data) {
                        if (!data.includes) {
                            data.includes = [{ "id": "//" + namespace +"/fixture/fixtures.js", "ignore" : true}];
                        }
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
    },
    jig: function (namespace, name, domain) {
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
        var done = this.async(),
            tplPath = path.join(templatesPath, 'jig'),
            jigFolderPath = path.join(projectRoot, namespace, 'jig'),
            jigPath,
            params;

        console.log(domain);
        jigPath = path.join(jigFolderPath, name);
        if (fs.existsSync(jigPath)) {
            grunt.log.error('Such jig already exists in namespace');
            return done();
        }

        params = getPlaceholders({name: name, namespace: namespace});

        async.series([
            _.curry(fsExtra.createFolderIfNotExists)(jigFolderPath),
            _.curry(fsExtra.createFolderIfNotExists)(jigPath),
            _.curry(fsExtra.copy)(tplPath, jigPath, params),
            function (next) {
                fsExtra.editConfigFile(domain, function (data) {
                    data.jigs = data.jigs || {};
                    var jigName = format('%s-jig-%s', params.namespace, params.name);

                    data.jigs[jigName] = {
                        "controller": format('%s.Jig.%s', params.Namespace, params.Name),
                        "template": format('%s/jig/%s/views/init.mustache',params.namespace, params.name),
                        "options": {},
                        "render": true,
                        "prerender": true

                    };
                    return data;
                }, next);
            }
        ], function (err) {
            if (err) {
                grunt.log.error('Error happened while jig creation', err);
                return done(err);
            }
            grunt.log.writeln('Jig created!');
            done();
        });
    }
};
