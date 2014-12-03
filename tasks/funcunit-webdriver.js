/**
 *
 *
 *
 *
 *
 *
 */

'use strict';


module.exports = function (grunt) {


    grunt.registerMultiTask('funcunit-webdriver', 'Run QUnit unit tests in a headless PhantomJS instance.', function () {
        var selenium = require('selenium-standalone');
        var helper = require('./qunit/helper.js');
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            // Default PhantomJS timeout.
            timeout: 60000,
            // Explicit non-file URLs to test.
            urls: [],
            // Connect phantomjs console output to grunt output
            console: false,
            // Do not use an HTTP base by default
            httpBase: false,
            // output as tap
            tap: true,
            // save code coverage
            coverage: !!this.options("coverage"),
            // browser
            browser: "chrome",
            // options for webdriver
            driverOptions: {
                hostname: grunt.option("ip") || '127.0.0.1',
                port: grunt.option("port") || 4444
            },
            // remote server or local
            remoteServer: grunt.option("remote") || false,
            // parallel count
            parallel: 2
        });

        var urls;

        if (options.httpBase) {
            //If URLs are explicitly referenced, use them still
            urls = options.urls;
            // Then create URLs for the src files
            this.filesSrc.forEach(function (testFile) {
                urls.push(options.httpBase + '/' + testFile);
            });
        } else {
            // Combine any specified URLs with src files.
            urls = options.urls.concat(this.filesSrc);
        }

        // This task is asynchronous.
        var done = this.async();

        // selenium server
        if (!options.remoteServer) {
            selenium();

        }
        ['exit', 'SIGTERM', 'SIGINT'].forEach(function listenAndKill(evName) {
            process.on(evName, function () {
                process.exit(1);
            });
        });

        // webdriver
        var wd = require('wd');
        // testcase fail indicator
        var fail = false;
        // tap log for output
        var tapLog = [];
        // tap for fail
        var tapFail = function (result) {
            return "1..1\nnot ok 1 - " + result;
        };


        setTimeout(function () {

            grunt.util.async.forEachLimit(urls, options.parallel, function (url, next) {
                var browser = wd.remote(options.driverOptions.hostname, options.driverOptions.port, 'promiseChain');


                // optional extra logging
                browser.on('status', function (info) {
                    options.console && console.log(info.cyan);
                });
                browser.on('command', function (eventType, command, response) {
                    options.console && console.log(' > ' + eventType.cyan, command, (response || '').grey);
                });
                browser.on('http', function (meth, path, data) {
                    options.console && console.log(' > ' + meth.magenta, path, (data || '').grey);
                });

                browser.init({browserName: options.browser}, function () {
                    // Process each filepath in-order.


                    browser.get(url, function () {
                        browser.waitForConditionInBrowser("typeof QUnit !== \"undefined\" && QUnit.jigMagga && QUnit.jigMagga.done === true", options.timeout, 1000, function (err) {
                            if (err) {
                                grunt.log.error(err);
                                fail = true;
                                tapLog = tapLog.concat(tapFail(url + " not loaded in time"));
                                browser.quit(function () {
                                    next();
                                });
                            } else {
                                browser.eval("JSON.stringify(QUnit.jigMagga.eventQueue)", function (err, result) {
                                    if (err) {
                                        grunt.log.error(err);
                                        fail = true;
                                        tapLog = tapLog.concat(tapFail(url + " not loaded in time"));
                                    } else {
                                        result = JSON.parse(result);
                                        var tapResult = helper.getTapLogFromQunitResult(result);
                                        tapLog = tapLog.concat(tapResult);
                                        var doneResult = result[result.length - 2][1];
                                        if (typeof doneResult.failed !== "undefined" && doneResult.failed == 0) {
                                            grunt.log.ok("Test Done: " + url);
                                        } else {
                                            grunt.log.error(url);
                                            grunt.log.error(JSON.stringify(result));
                                            fail = true;
                                        }
                                    }
                                    browser.quit(function () {
                                        next();
                                    });

                                });
                            }

                        });
                    });

                }).setAsyncScriptTimeout(options.timeout);

                // All tests have been run.
            }, function () {
                // All done!
                if (options.tap) {
                    helper.tapReport(tapLog);
                }
                if (fail) {
                    done(false);
                } else {
                    done();
                }

            });


        }, 3000);

    });

};