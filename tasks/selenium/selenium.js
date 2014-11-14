var fs = require("fs"),
    headless = require('headless'),
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
            var headlessOptions = {
                    display: {width: 1024, height: 768, depth: 8}
                },
                server;
            if (options.headless) {
                headless(headlessOptions, 1, function (err, childProcess, servernum) {
                    // childProcess is a ChildProcess, as returned from child_process.spawn()
                    if(err){
                        throw new Error(err);
                    }
                    server = selenium({
                        stdio: 'inherit',
                        env: util._extend(process.env, {
                            "DISPLAY": ":"+servernum
                        })
                    });
                    console.log("DISPLAY", ":"+servernum+".0");
                    setTimeout(function(){
                        callback(server, childProcess);
                    }, 2500);
                });
            } else {
                server = selenium();
                setTimeout(function(){
                    callback(server);
                }, 2500);
            }

        }
    };


};


