/**
 *
 *
 *
 *
 *
 *
 */

'use strict';


var selenium = require('selenium-standalone');
var helper = require('./qunit/helper.js');

module.exports = function (grunt) {


    grunt.registerMultiTask('funcunit-webdriver', 'Run QUnit unit tests in a headless PhantomJS instance.', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            // Default PhantomJS timeout.
            timeout: 60000,
            // Explicit non-file URLs to test.
            urls: [],
            // Connect phantomjs console output to grunt output
            console: true,
            // Do not use an HTTP base by default
            httpBase: false,
            // output as tap
            tap: true,
            // save code coverage
            coverage: !!this.options("coverage"),
            // browser
            browser : "chrome",
            // options for webdriver
            driverOptions: {
                hostname: grunt.option("ip") || '127.0.0.1',
                port: grunt.option("port") ||  4444
            },
            // remote server or local
            remoteServer: grunt.option("remote") || false
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
        if(!options.remoteServer){
            selenium();
        }
        // webdriver
        var wd = require('wd');
        // testcase fail indicator
        var fail = false;
        // tap log for output
        var tapLog = [];


        setTimeout(function () {


            var browser =  wd.remote(options.driverOptions.hostname, options.driverOptions.port, 'promiseChain');


            // optional extra logging
            browser.on('status', function (info) {
                console.log(info.cyan);
            });
            browser.on('command', function (eventType, command, response) {
                console.log(' > ' + eventType.cyan, command, (response || '').grey);
            });
            browser.on('http', function (meth, path, data) {
                console.log(' > ' + meth.magenta, path, (data || '').grey);
            });

            browser.init({browserName: options.browser}, function () {
                // Process each filepath in-order.
                grunt.util.async.forEachLimit(urls, 1, function (url, next) {


                        browser.get(url, function () {
                            browser.waitForConditionInBrowser("typeof QUnit !== \"undefined\" && QUnit.jigMagga && QUnit.jigMagga.done === true", options.timeout, 1000, function (err) {
                                if (err) {
                                    grunt.fail.warn(err);
                                }
                                browser.eval("JSON.stringify(QUnit.jigMagga.eventQueue)", function (err, result) {
                                    if (err) {
                                        grunt.fail.warn(err);
                                    }
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
                                    next();
                                });
                            });
                        });


                    },
                    // All tests have been run.
                    function () {
                        // All done!
                        browser.quit(function () {
                            if (options.tap) {
                                helper.tapReport(tapLog);
                            }
                            if (fail) {
                                done(false);
                            } else {
                                done();
                            }

                        });
                    });
            }).setAsyncScriptTimeout(options.timeout);

        }, 3000);

    });

};