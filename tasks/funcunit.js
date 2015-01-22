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

    grunt.registerMultiTask('funcunit', 'Run QUnit unit tests in a headless PhantomJS instance.', function () {
        var phridge = require("phridge");
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            // Default PhantomJS timeout.
            timeout: 60000,
            // Explicit non-file URLs to test.
            urls: [],
            force: false,
            // Connect phantomjs console output to grunt output
            console: true,
            // Do not use an HTTP base by default
            httpBase: false,
            // output as tap
            tap: !!this.options("tap"),
            // save code coverage
            coverage: !!this.options("coverage")
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
        // if testcase fail this will set to true
        var fail = false;

        // quit all child process
        process.on('exit', function () {
            phridge.disposeAll();
        });
        phridge.spawn({
            webSecurity: false
        }).then(function (phantom) {

            // Process each filepath in-order.
            grunt.util.async.forEachLimit(urls, 1, function (url, next) {

                    var page = phantom.createPage();
                    // phantom is now a reference to a specific PhantomJS process
                    grunt.log.writeln("Open page: " + url);
                    page.run(url, options.timeout, function (url, timeout, resolve) {
                        // this code runs inside PhantomJS

                        var checkInterval = null,
                            checkTimeout = null,
                            page = this;

                        page.open(url, function (status) {
                            if (status !== "success") {
                                reject(new Error('Open on: ' + url));
                                return;
                            }
                            // check if test is donec
                            function checkTestIsDone() {
                                return page.evaluate(function () {
                                    return typeof QUnit !== "undefined" && QUnit.jigMagga && QUnit.jigMagga.done;
                                });
                            }

                            function getTestResult() {
                                return page.evaluate(function () {
                                    if (typeof QUnit !== "undefined" && QUnit.jigMagga && QUnit.jigMagga.done) {
                                        return QUnit.jigMagga.eventQueue;
                                    }
                                });
                            }

                            // check interval to check test done
                            checkInterval = setInterval(function () {

                                if (checkTestIsDone()) {
                                    clearTimeout(checkTimeout);
                                    clearInterval(checkInterval);
                                    resolve(getTestResult());

                                }
                            }, 1000);
                            // set timeout when test fails
                            checkTimeout = setTimeout(function () {
                                clearInterval(checkInterval);
                                reject(new Error('Timeout on: ' + url));
                            }, timeout);


                        });
                    }).then(function (result) {
                        // inside node again
                        var doneResult = JSON.parse(result[result.length - 2])[1];
                        if (typeof doneResult.failed !== "undefined" && doneResult.failed == 0) {
                            grunt.log.ok("Test Done: " + url);
                        } else {
                            fail = true;
                            grunt.log.error(url);
                            grunt.log.error(JSON.stringify(result));
                        }
                        page.dispose().then(function () {
                            next();
                        });

                    }).catch(function (err) {
                        grunt.log.error(url);
                        grunt.log.error(new Error(JSON.stringify(err)));
                        page.dispose().then(function () {
                            next();
                        });
                    });
                },
                // All tests have been run.
                function () {
                    phridge.disposeAll().then(function () {
                        // All done!
                        if (fail) {
                            done(false);
                        } else {
                            done();
                        }
                    });
                });
        }).catch(function (err) {
            grunt.log.error(url);
            grunt.log.error(err);
            phridge.disposeAll().then(function () {
                // All done!
                done();
            });
        });

    });

};