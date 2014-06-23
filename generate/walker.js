'use strict';

var walk = require('walk'),
    path = require('path'),
    _ = require('lodash'),
    fs = require('fs');

var projectPath = path.join(__dirname, '..');

var isDomain = function (domainName) {
    var regexp = new RegExp('^[\\w\\d-]+(\\.[\\w\\d-]+)*(\\.[\\w]{2,})$', 'ig');
    return regexp.test(domainName);
};

/**
 * create walker
 * @namespace walker
 * @param path
 * @param config
 * @return {{getDefaultNamespace: getDefaultNamespace}}
 */
module.exports = function (defaultFolderPath, config) {
    var getWalker = function (folderPath, listeners) {
        if (listeners) {
            config.listeners = listeners;
            return walk.walkSync(folderPath, config);
        }

        return walk.walk(folderPath, config);
    };

    /**
     * @extends walker
     */
    return {
        /**
         * return first namespace name in project folder
         * @param {string} rootPath
         * @return {*}
         */
        getDefaultNamespace: function (rootPath) {
            var defaultNamespace;

            rootPath = rootPath || defaultFolderPath;

            getWalker(rootPath, {
                files: function (root, fileStats, next) {
                    var folder = _.last(root.split(path.sep)),
                        pageConfStats,
                        configPath,
                        config;
                    if (defaultNamespace || folder !== 'page') {
                        return next();
                    }

                    pageConfStats = _.find(fileStats, {name: 'page.conf'});
                    if (!pageConfStats) {
                        return next();
                    }

                    configPath = path.join(projectPath, root, pageConfStats.name);
                    try {
                        config = fs.readFileSync(configPath).toString('utf-8');
                        config = JSON.parse(config);
                    } catch (err) {
                        return next();
                    }

                    defaultNamespace = config.namespace;
                    next();
                }
            });

            return defaultNamespace;
        },

        /**
         * returns list of all pages in all domains
         * returns first 40 for now
         *
         * @param {string} namespace
         * @return {array}
         */
        getAllPagesInDomains: function (namespace) {
            
            var rootPath = path.join(projectPath, namespace),
                results = [];

            getWalker(rootPath, {
                files: function (root, fileStats, next) {
                    var pathList = root.split(path.sep),
                        folder = _.last(root.split(path.sep)),
                        domains,
                        defaultPath,
                        domain,
                        page,
                        pageConfigStats;

                    pageConfigStats = _.find(fileStats, {name: folder + '.conf'});

                    if (!pageConfigStats) {
                        return next();
                    }

                    if (isDomain(folder)) {
                        domain = folder;
                        page = 'main';
                    } else if (folder === 'page' && pathList[pathList.length - 2] === namespace) {
                        domain = page = 'all';
                    } else {
                        domains = _.filter(pathList, isDomain);
                        domain = _.last(domains);
                        if (!domain) {
                            defaultPath = pathList.slice(pathList.indexOf('default'), pathList.length - 1);
                            domain = defaultPath.join('_');
                        }
                        page = folder;
                    }
                    results.push({name:domain + '/' + page, value: root + '/' + pageConfigStats.name});
                    next();
                }
            });

            return _.first(results, 40);
        },

        /**
         * return all domains
         *
         * @param namespace
         * @return {Array}
         */
        getAllDomains: function (namespace) {

            var rootPath = path.join(projectPath, namespace),
                results = [];

            getWalker(rootPath, {
                files: function (root, fileStats, next) {
                    var folder = _.last(root.split(path.sep)),
                        pageConfigStats;

                    pageConfigStats = _.find(fileStats, {name: folder + '.conf'});

                    if (!pageConfigStats || !isDomain(folder) ) {
                        return next();
                    }

                    results.push({name: folder, value: root});
                    next();
                }
            });

            return results;
        },

        /**
         * return all domain grouped by namespace
         * @param namespace
         * @return {*}
         */
        getAllNamespaceDomain: function (namespace) {
            var rootPath = path.join(projectPath, namespace),
                results = [];

            getWalker(rootPath, {
                files: function (root, fileStats, next) {
                    var folder = _.last(root.split(path.sep)),
                        configPath,
                        config,
                        pageConfigStats;

                    pageConfigStats = _.find(fileStats, {name: folder + '.conf'});

                    if (!pageConfigStats || !isDomain(folder) ) {
                        return next();
                    }

                    configPath = path.join(root, pageConfigStats.name);
                    try {
                        config = fs.readFileSync(configPath).toString('utf-8');
                        config = JSON.parse(config);
                    } catch (err) {
                        return next();
                    }

                    results.push({name: config.domain, value: root});
                    next();
                }
            });

            return _(results)
                .filter(function (item) {
                    return item.name;
                })
                .groupBy('name')
                .map(function (value, key) {
                    return {name: key, value: JSON.stringify(value)};
                })
                .value();

        },

        /**
         * get first index page in the first project in the folder
         * @return {*}
         */
        getIndexPage: function () {
            var files = [], result;
            getWalker(projectPath, {
                files: function (root, fileStats, next) {
                    var folderList = root.split('/'),
                        indexFile;

                    indexFile = _.find(fileStats, function (stats) {
                        return stats.name === 'index.html' || stats.name === 'index.shtml';
                    });

                    function inDomainOrDefault() {
                        var domainName = folderList[folderList.length - 2];
                        return isDomain(domainName) || domainName === 'default';
                    }

                    if (!indexFile ||
                        _.last(folderList) !== 'index' ||
                        !inDomainOrDefault()) {
                        return next();
                    }
                    files.push(path.join(root, indexFile.name));
                }
            });

            result = _.first(files);

            result = result.replace(projectPath, '');
            return result;
        },

        /**
         * invoke action(domainName, domainPath) for each domain in the namespace
         * @param {string} namespace
         * @param {function} action
         * @param {function} callback
         */
        forEachDomain: function (namespace, action, callback) {

            var rootPath = path.join(projectPath, namespace),
                walker = getWalker(rootPath);

            walker.on('files', function (root, fileStats, next) {
                    var folder = _.last(root.split(path.sep)),
                        pageConfigStats;

                    pageConfigStats = _.find(fileStats, {name: folder + '.conf'});

                    if (!pageConfigStats || !isDomain(folder) ) {
                        return next();
                    }

                    action(folder, root, next);
                }
            );

            walker.on('end', function () {
                callback();
            });

        }

    };
};