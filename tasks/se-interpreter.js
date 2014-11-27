module.exports = function (grunt) {

    var helper = require("./selenium/selenium.js")(grunt);
    grunt.registerTask('se-interpreter', 'Selenium testing json files from selenium builder (saucelabs)', function (path) {
        var done = this.async();
        var si = require('se-interpreter'),
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
                port: grunt.option("port") ||  4444
            },
            // remote server or local
            remoteServer: grunt.option("remote") || false
        });

        options.files = grunt.file.expandMapping(options.path && options.path.indexOf(".json") === -1 ? (options.path + "*.json") : options.path);

        var kill = function (callback) {
            console.log("Killing processes ....");
            if (Server) {
                Server.kill();
            }
            if (tr && tr.wd) {
                tr.wd.quit();
            }
            setTimeout(function () {
                callback && callback();
            }, 3000);
        };
        ['exit', 'SIGTERM', 'SIGINT'].forEach(function listenAndKill(evName) {
            process.on(evName, kill);
        });


        helper.startServer(options, function (server) {

            Server = server;

            // Process each filepath in-order.
            grunt.util.async.forEachLimit(options.files, 1, function (file, next) {


                var testFile = grunt.file.readJSON(file.dest);

                //check if suite
                if (testFile.type === "suite") {
                    testFile = helper.renderSEBuilderSuite(testFile, options);
                }

                var timer = setTimeout(function () {
                    grunt.fail.warn("Timeout appears " + options.timeout);
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
                    }else{
                        grunt.log.ok(JSON.stringify(info));
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
                kill(function () {
                    done();
                });
            });

        });
    });


};