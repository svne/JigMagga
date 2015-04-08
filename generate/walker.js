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
 * @return {{getDefaultNamespace: getNamespaces}}
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
         * return list of namespaces name in project folder
         * @param {string} rootPath
         * @return {*}
         */
        getNamespaces: function (rootPath) {
            var defaultNamespaces = [];

            rootPath = rootPath || defaultFolderPath;

            getWalker(rootPath, {
                files: function (root, fileStats, next) {
                    var folder = _.last(root.split(path.sep)),
                        pageConfStats,
                        configPath,
                        config;
                    if (folder !== 'page') {
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

                    defaultNamespaces.push(config.namespace);
                    next();
                }
            });

            return defaultNamespaces;
        },

        /**
         * returns list of all pages in all domains
         * returns first 40 for now
         *
         * @param {string} namespace
         * @return {array}
         */
        getAllPagesInDomains: function (namespace, domain) {

            var rootPath,
                results = [];

            if (!domain) {
                rootPath = path.join(projectPath, namespace);
            } else {
                rootPath = (domain !== 'default') ? domain : path.join(projectPath, namespace, 'page/default');
            }

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
                        page = '';
                    } else if (folder === 'page' && pathList[pathList.length - 2] === namespace) {
                        domain = page = 'all';
                    } else {
                        domains = _.filter(pathList, isDomain);
                        domain = _.last(domains);
                        if (!domain) {
                            defaultPath = pathList.slice(pathList.indexOf('default'), pathList.length - 1);
                            domain = defaultPath.join('/');
                        }
                        page = folder;
                    }
                    results.push({name:domain + '/' + page, value: root + '/' + pageConfigStats.name});
                    next();
                }
            });

            return results;
        },

        /**
         * return all domains
         *
         * @param {String} namespace
         * @param {String} domainPath
         * @return {Array}
         */
        getAllDomains: function (namespace, domainPath) {

            var rootPath = domainPath ? domainPath : path.join(projectPath, namespace),
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
         * return all domains
         *
         * @param namespace
         * @return {Array}
         */
        getAllFirstLevelDomains: function (namespace) {

            var rootPath = path.join(projectPath, namespace),
                results = [];

            getWalker(rootPath, {
                files: function (root, fileStats, next) {
                    var folderList = root.split(path.sep),
                        folder = _.last(folderList),
                        pageConfigStats;

                    pageConfigStats = _.find(fileStats, {name: folder + '.conf'});

                    if (!pageConfigStats ||
                        !isDomain(folder) ||
                        folderList[folderList.length - 2] !== 'page') {
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
        getIndexPage: function (namespace) {
            var files = [], result;
            var rootPath = projectPath;
            if (namespace) {
                rootPath += '/' + namespace;
            }
            getWalker(rootPath, {
                files: function (root, fileStats, next) {
                    var folderList = root.split('/'),
                        indexFile;
                    indexFile = _.find(fileStats, function (stats) {
                        return stats.name === 'index.html';
                    });

                    var domainName = folderList[folderList.length - 2];

                    function inDomainOrDefault() {
                        return isDomain(domainName) || domainName === 'default';
                    }

                    if (!indexFile ||
                        _.last(folderList) !== 'index' ||
                        !inDomainOrDefault()) {
                        return next();
                    }

                    files.push({
                        namespace: folderList[folderList.length - 4],
                        domain: domainName,
                        path: path.join(root, indexFile.name)
                    });
                    next();
                }
            });

            if (!files.length) {
                return false;
            }

            var file = _.first(files);
            result = file.path.replace(projectPath, '');

            if (file.domain !== 'default') {
                return result;
            }

            var otherDomainInNamespace = _.find(files, function (item) {
                return item.namespace === file.namespace && item.domain !== 'default';
            });

            if (otherDomainInNamespace) {
                return otherDomainInNamespace.path.replace(projectPath, '');
            }

            var domains = this.getAllDomains(file.namespace);

            if (!domains.length) {
                return result;
            }
            return result.replace('default', _.first(domains).name);

        },

        forEachFile: function (path, action, callback) {
            var walker = walk.walk(path, {});

            walker.on('files', function (root, stats, next) {
                action(root, stats, next);
            });

            walker.on('errors', function (root, nodeStatsArray, next) {
                next('error while geting all files');
            });

            walker.on('end', function () {
                callback();
            });
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

        },

        forEachPageInPath: function (rootPath, action, callback) {

            this.forEachFile(rootPath, function (root, fileStats, next) {

                var folder = _.last(root.split(path.sep)),
                    pageConfigStats;

                pageConfigStats = _.find(fileStats, {name: folder + '.html'});

                if (!pageConfigStats) {
                    return next();
                }
                action(pageConfigStats.name, root, next);
            }, callback);
        }

    };
};
