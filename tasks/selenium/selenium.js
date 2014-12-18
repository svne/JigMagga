var fs = require("fs"),
    selenium = require('selenium-standalone'),
    util = require("util"),
    path = require("path");

module.exports = function (grunt) {
    "use strict";

    return {

        replaceVariableFromDataSource: function(document, documentPath){
            var loadedFile,
                newDocument,
                newSteps = [];
            if(document && document.data && document.data.configs && document.data.configs.json && document.data.configs.json.path){
                loadedFile = grunt.file.readJSON(path.join(documentPath.replace(/\/[^/]*.json$/, ""), document.data.configs.json.path));
                loadedFile.forEach(function (item) {
                    newDocument = JSON.stringify(document.steps);
                    for(var key in item) {
                        newDocument = newDocument.replace(new RegExp("\\$\\{" + key + "\\}", "g"), item[key]);

                    }
                    newSteps = newSteps.concat(JSON.parse(newDocument));
                });
                document.steps = newSteps;
            }
            return document;
        },
        renderSEBuilderSuite: function (suite, options) {
            var loadedFile,
                documentPath,
                self = this;
            suite.type = "script";
            suite.steps = [];
            if (suite && suite.scripts) {
                suite.scripts.forEach(function (item) {
                    documentPath = path.join(options.path.replace(/\/[^/]*.json$/, ""), item.path);
                    loadedFile = grunt.file.readJSON(documentPath);
                    if (loadedFile && loadedFile.steps) {
                        loadedFile = self.replaceVariableFromDataSource(loadedFile, documentPath);
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


