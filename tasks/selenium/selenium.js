var fs = require("fs"),
    selenium = require('selenium-standalone'),
    util = require("util"),
    path = require("path");

module.exports = function (grunt) {
    "use strict";

    return {

        renderSEBuilderSuite: function (suite, options) {
            var loadedFile;
            suite.type = "script";
            suite.steps = [];
            if (suite && suite.scripts) {
                suite.scripts.forEach(function (item) {
                    loadedFile = grunt.file.readJSON(path.join(options.path.replace(/\/[^/]*.json$/, ""), item.path));
                    if (loadedFile && loadedFile.steps) {
                        suite.steps = suite.steps.concat(loadedFile.steps);
                    }
                });
            }
            return suite;
        },
        startServer: function (options, callback) {
            if (options.remoteServer) {
                callback && callback(null);
            } else {
                var server = selenium();
                setTimeout(function () {
                    callback(server);
                }, 2500);
            }
        }
    };


};


