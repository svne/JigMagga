var stealBuild = require("./steal-build/lib/index.js"),
    es = require('event-stream'),
    helper = require('./helper.js'),
    async = require('async'),
    util = require("util"),
    fs = require('fs'),
    extend = require('node.extend');

/**
 *
 * @param steal
 * @param item
 */

function setupStealconfig(steal, item) {
    var loadFile = function (options) {
        var src = typeof options.src === "string" ? options.src : options.src.path;
        return fs.readFileSync(src, {
            encoding: "utf8"
        });
    };
    global.navigator = {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.125 Safari/537.36"
    };
    global.window = global;
    steal.config({
        root: item.build.jigMaggaPath,
        pathToBuild: "/" + helper.getRelativePathFromStealRootPath(item.build.pageHTMLPath, item.build.jigMaggaPath),
        isBuild: true,
        types: {
            text: function (options, success) {
                options.text = loadFile(options);
                success()
            },
            ejs: function (options, success) {
                options.text = loadFile(options);
                success();
            },
            js: function (options, success) {
                options.text = loadFile(options);
                var stealInFile = /steal\(/.test(options.text);
                if (stealInFile || options.id.path.indexOf("steal-types") !== -1) {
                    eval(options.text);
                }
                success();
            },
            scss: function (options, success) {
                options.text = loadFile(options);
                success();
            },
            css: function (options, success) {
                options.text = loadFile(options);
                success();
            },
            mustache: function (options, success) {
                options.text = loadFile(options);
                success();
            },
            "fn": function (options, success) {
                if (options.id.path.indexOf("steal-types") !== -1) {
                    options.fn();

                }
                success();
            },
            "po": function (options, success) {
                success();
            }
        }
    });
}

/**
 * returns all dependencies as an array
 * @param steals
 * @returns {Array}
 */
function getAllDependencies(steals) {
    var module = {},
        modules = [];

    !function test(dependencies) {
        for (var key in dependencies) {
            if (dependencies[key]) {
                dependencies[key].options.src = typeof dependencies[key].options.src === "string" ? {path: dependencies[key].options.src} : dependencies[key].options.src;
                if (!dependencies[key].options.putDependenciesAfterThisModuleForBuild) {
                    if (dependencies[key] && dependencies[key].dependencies.length) {
                        test(dependencies[key].dependencies)
                    }
                    if (dependencies[key] && dependencies[key].needsDependencies.length) {
                        test(dependencies[key].needsDependencies)
                    }
                }

                if ((dependencies[key].options.src && dependencies[key].options.src.path) && !module[dependencies[key].options.src.path]) {
                    module[dependencies[key] && dependencies[key].options.src && dependencies[key].options.src.path] = true;
                    if (!dependencies[key].options.text) {
                        console.log("NO TEXT: ", dependencies[key].options.src.path);
                        dependencies[key].options.text = "";
                    }
                    modules.push(dependencies[key].options);
                }

                if (dependencies[key].options.putDependenciesAfterThisModuleForBuild) {

                    if (dependencies[key].dependencies.length) {
                        test(dependencies[key].dependencies)
                    }
                    if (dependencies[key].needsDependencies.length) {
                        test(dependencies[key].needsDependencies)
                    }
                }
            }
        }
    }(steals);
    return modules;
}


function removeDuplicateDependencies(dependencies) {
    var arrayOfPaths = [];
    for (var i = 0; i < dependencies.length; i++) {
        if (arrayOfPaths.indexOf(dependencies[i].id.path) === -1) {
            arrayOfPaths.push(dependencies[i].id.path);
        } else {
            dependencies.splice(i + 1, 1);
        }
    }
}

module.exports = {

    /**
     *
     * @returns {*}
     */
    getJSAndHTMLFilePath: function () {
        var defaultPathJSFile,
            domainPathJSFile,
            domainPathHTMLFile,
            defaultPathHTMLFile;
        return es.map(function (data, callback) {
            if (!data.length) {
                throw Error("Stream is not an array of pages conf");
            }
            async.map(data, function (item, cb) {
                if (!item.build || !item.build.defaultPath || !item.build.basePath) {
                    throw Error("Stream need build object with {defaultPath: \"\", basePath: \"\"} ")
                }
                domainPathJSFile = helper.getFileFromPath(item.build.basePath + "/" + item.build.domain + "/" + item.build.page, "js");
                defaultPathJSFile = helper.getFileFromPath(item.build.defaultPath + "/" + item.build.page, "js");
                item.build.pageHTMLPath = helper.getFileFromPath(item.build.basePath + "/" + item.build.domain + "/" + item.build.page, "html");
                if (fs.existsSync(domainPathJSFile)) {
                    item.build.pageJSPath = domainPathJSFile;
                } else if (fs.existsSync(defaultPathJSFile)) {
                    item.build.pageJSPath = defaultPathJSFile;
                } else {
                    throw Error("No js file for page found");
                }
                cb(null, item);
            }, function (err, result) {
                callback(null, result);
            })
        })
    },

    /**
     *
     * @returns {*}
     */
    openPagesAndGrepDependencies: function () {
        return es.map(function (data, callback) {
            steal.one("done", function () {
                if (!data.length) {
                    throw Error("Stream is not an array of pages conf");
                }
                async.mapLimit(data, 1, function (item, cb) {
                    if (!item.build || !item.build.pageJSPath) {
                        throw Error("Stream need build object with {pageJSPath: \"\"} ")
                    }
                    var openerSteal = steal.clone();
                    setupStealconfig(openerSteal, item);

                    openerSteal.one("end", function (rootsteal) {
                        item.build.dependencies = getAllDependencies(rootsteal.dependencies);
                        cb(null, item);
                    });
                    openerSteal(helper.getRelativePathFromStealRootPath(item.build.pageJSPath, item.build.jigMaggaPath));
                }, function (err, result) {
                    callback(null, result);
                })
            })
        })
    },
    /**
     * get current view for locale
     * @returns {*}
     */
    getCurrentView: function () {
        return es.map(function (data, callback) {
            var dependencies = data.build.dependencies;
            for (var i = 0; i < dependencies.length; i++) {
                if (dependencies[i].locale) {
                    if (dependencies[i].jig.template[data.build.locale]) {
                        dependencies[i].text = fs.readFileSync(data.build.jigMaggaPath + "/" + dependencies[i].jig.template[data.build.locale], {encoding: "utf8"});
                    }
                }
            }
            callback(null, data);
        })
    },
    /**
     * TODO do this on the plain dependencies tree not on the sorted or remove dependencies from old controller
     * @returns {*}
     */
    checkDependenciesForBrowserSupport: function () {
        return es.map(function (data, callback) {
            var index = 0;
            async.mapSeries(data.build.dependencies, function (item, cb) {
                index++;
                if (item.jig && item.jig.browser) {
                    var confBrowser = item.jig.browser,
                        browsers = Object.keys(confBrowser);
                    for (var j = 0; j < browsers.length; j++) {
                        if (data.build.browser[browsers[j]] && confBrowser[browsers[j]].version.indexOf(data.build.browser.version) !== -1) {
                            if (confBrowser[browsers[j]].controller) {
                                var path = confBrowser[browsers[j]].controller.toLowerCase().replace(/\./g, "/");
                                var openerSteal = steal.clone();
                                setupStealconfig(openerSteal, data);
                                openerSteal.one("end", function (rootsteal) {
                                    // insert and concat new dependencies
                                    var newDependencies = getAllDependencies(rootsteal.dependencies),
                                        spliceOptions = [index, 0];
                                    spliceOptions.concat(newDependencies);
                                    data.build.dependencies.splice.apply(data.build.dependencies, spliceOptions);
                                    removeDuplicateDependencies(data.build.dependencies);
                                    item.ignore = true;
                                    cb(null, item);
                                });
                                openerSteal(path);
                            } else {
                                item.ignore = true;
                                cb(null, item);
                            }
                        } else {
                            cb(null, item);
                        }
                    }
                } else {
                    cb(null, item);
                }
            }, function (err, results) {
                data.build.dependencies = results;
                callback(null, data);
            });

        })
    },
    /**
     * get current view for locale
     * @returns {*}
     */
    setCurrentSCSSVariables: function () {
        return es.map(function (data, callback) {
            callback(null, data);
        })
    }
};