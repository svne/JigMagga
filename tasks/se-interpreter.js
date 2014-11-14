module.exports = function (grunt) {

    var helper = require("./selenium/selenium.js")(grunt);
    grunt.registerTask('se-interpreter', 'Selenium testing json files from selenium builder (saucelabs)', function (path) {
        var done = this.async();
        var selenium = require('selenium-standalone'),
            si = require('se-interpreter');

        // check for fails
        process.stderr.on('data', function (output) {
            grunt.fail.warn(output);
        });




        var options = this.options({
            // Default PhantomJS timeout.
            timeout: 120000,
            // Explicit path to directory with json files.
            path: path,
            force: false,
            // Connect selenium console output to grunt output
            console: true,
            // browser
            browser: "firefox",
            //headless Xvfb
            headless: !!grunt.option("headless")
        });

        options.files = grunt.file.expandMapping(options.path && options.path.indexOf(".json") === -1 ? (options.path + "*.json") : options.path);

        helper.startServer(options, function (server, Xvfb) {

            process.on('exit', function () {
                if (server) {
                    server.kill();
                }
                if (Xvfb) {
                    Xvfb.kill();
                }
            });


            // Process each filepath in-order.
            grunt.util.async.forEachLimit(options.files, 1, function (file, next) {


                var testFile = grunt.file.readJSON(file.dest);

                //check if suite
                if (testFile.type === "suite") {
                    testFile = helper.renderSEBuilderSuite(testFile, options);
                }

                var timer = setTimeout(function () {
                    grunt.fail.warn("Timeout appears " + options.timeout);
                    next();
                }, options.timeout);

                var tr = new si.TestRun(testFile);
                tr.browserOptions = {'browserName': options.browser};
                tr.listener = si.getInterpreterListener(tr);
                tr.listener.startTestRun = function (testRun, info) {
                    grunt.log.writeln("Open:" + file.dest);
                    if (info.success === false) {
                        grunt.fail.warn(info.error);
                    }
                    if (tr.hasNext()) {
                        tr.next();
                    }
                };
                tr.listener.startStep = function (testRun, info) {
                    if (info.success === false) {
                        grunt.fail.warn(info.error);
                    }
                };
                tr.listener.endStep = function (testRun, info) {
                    if (info.success === false) {
                        grunt.fail.warn(info.error);
                    }
                    if (tr.hasNext()) {
                        tr.next();
                    } else {
                        tr.end();
                    }
                };
                tr.listener.endTestRun = function (testRun, info) {
                    if (info.success === false) {
                        grunt.fail.warn(info.error);

                    }
                    if (tr.hasNext()) {
                        tr.end();
                    } else {
                        clearTimeout(timer);
                        next();
                    }
                };
                tr.start();


            }, function () {
                done();
            });

        });
    });


};