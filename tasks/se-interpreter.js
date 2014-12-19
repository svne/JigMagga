module.exports = function (grunt) {
    "use strict";

    grunt.registerTask('se-interpreter', 'Selenium testing json files from selenium builder (saucelabs)', function (path) {
        var helper = require("./selenium/selenium.js")(grunt),
            done = this.async(),
            si = require('se-interpreter'),
            test = require('tape'),
            tr, Server;


        var options = this.options({
            // Default PhantomJS timeout.
            timeout: grunt.option("timeout") || 120000,
            // Explicit path to directory with json files.
            path: path,
            // browser
            browser: grunt.option("browser") || "firefox",
            // options for webdriver
            driverOptions: {
                hostname: grunt.option("ip") || '127.0.0.1',
                port: grunt.option("port") || 4444
            },
            // remote server or local
            remoteServer: grunt.option("remote") || false,
            // selenium server options https://www.npmjs.com/package/selenium-standalone
            seleniumServer: {
                spawnOptions: null /*{ stdio: 'inherit' }*/,
                seleniumArgs: null /*["--debug"]*/
            },
            // tap result
            tap: !!grunt.option("tap"),
            outputFile: grunt.option("tap-file") || "tap.log"
        });

        var log = function (ok, msg, test) {
                if (options.tap && test) {
                    test.ok(ok, msg);
                } else {
                    if (ok) {
                        grunt.log.ok(msg);
                    } else {
                        grunt.log.error(msg);
                    }
                }

            },
            testStart = function (name, cb) {
                if (options.tap) {
                    test('Test: ' + name, function (t) {
                        cb(t);
                    });
                } else {
                    cb(null);
                }
            };

        options.files = grunt.file.expandMapping(options.path && options.path.indexOf(".json") === -1 ? (options.path + "*.json") : options.path);

        process.on('SIGINT', function () {
            process.exit(1);
        });

        helper.startServer(options, function (server) {

            Server = server;

            if (options.tap) {
                var file = require("fs").createWriteStream(options.outputFile);
                var outStream = test.createStream();
                outStream.pipe(file);
                outStream.pipe(process.stdout);
            }


            // Process each filepath in-order.
            grunt.util.async.forEachLimit(options.files, 1, function (file, next) {


                var testFile = grunt.file.readJSON(file.dest);

                //check if suite
                if (testFile.type === "suite") {
                    testFile = helper.renderSEBuilderSuite(testFile, options);
                } else {
                    testFile = helper.replaceVariableFromDataSource(testFile, file.dest);
                }


                testStart('Test: ' + file.dest, function (t) {

                    var timer = setTimeout(function () {
                        log(false, "Timeout appears " + options.timeout + " | " + JSON.stringify(tr && tr.currentStep()), t);
                        if (tr && tr.wd) {
                            tr.wd.quit();
                        }
                        next();
                    }, options.timeout);

                    tr = new si.TestRun(testFile);
                    tr.browserOptions = {'browserName': options.browser};
                    tr.driverOptions = options.driverOptions;
                    tr.listener = si.getInterpreterListener(tr);
                    tr.listener.startTestRun = function (testRun, info) {
                        if (info.success === false) {
                            log(false, info.error, t);
                        }
                        if (tr.hasNext()) {
                            tr.next();
                        }
                    };
                    tr.listener.startStep = function (testRun, info) {
                        if (info.success === false) {
                            log(false, info.error, t);
                        }

                    };
                    tr.listener.endStep = function (testRun, info) {
                        if (info.success === false) {
                            log(false, info.error, t);
                        } else if (info.success) {
                            log(true, info.success, t);
                        }
                        if (tr.hasNext()) {
                            tr.next();
                        } else {
                            tr.end();
                        }
                    };
                    tr.listener.endTestRun = function (testRun, info) {
                        if (info.success === false) {
                            log(false, info.error, t);
                        }
                        if (tr.hasNext()) {
                            tr.end();
                        } else {
                            clearTimeout(timer);
                            t && t.end();
                            next();
                        }
                    };


                    tr.start();
                });

            }, function () {
                done();
            });

        });
    });


};