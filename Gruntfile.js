module.exports = function(grunt) {
    "use strict";

    var ssInclude = new(require("ssi")),
        fs = require("fs"),
        compiler = require('can-compile');

    grunt.initConfig({
        connect: {
            server: {
                options: {
                    keepalive: true,
                    open: true,
                    middleware: function(connect, options, middlewares) {
                        // inject a custom middleware into the array of default middlewares
                        middlewares.unshift(function(req, res, next) {
                            if (req.url === "/") {
                                res.writeHead(301,
                                    {Location: '/page/index/index.html'}
                                );
                                res.end();
                            } else if (req.url && req.url.search(/\.[s]{0,1}html/) !== -1) {
                                var filename = options.base[0] + req.url,
                                    filenameSHTML = filename.replace(/\.html/, ".shtml"),
                                    defaultBase = filename.replace(/\/page\/[^\/]*\//, '/page/default/'),
                                    defaultBaseSHTML = filenameSHTML.replace(/\/page\/[^\/]*\//, '/page/default/');
                                if (fs.existsSync(filename)) {
                                    res.end(ssInclude.parse(filename, fs.readFileSync(filename, {
                                        encoding: "utf8"
                                    })).contents);
                                } else if (fs.existsSync(filenameSHTML)) {
                                    res.end(ssInclude.parse(filenameSHTML, fs.readFileSync(filenameSHTML, {
                                        encoding: "utf8"
                                    })).contents);
                                } else if (fs.existsSync(defaultBase)) {
                                    res.end(ssInclude.parse(defaultBase, fs.readFileSync(defaultBase, {
                                        encoding: "utf8"
                                    })).contents);
                                } else if (fs.existsSync(defaultBaseSHTML)) {
                                    res.end(ssInclude.parse(defaultBaseSHTML, fs.readFileSync(defaultBaseSHTML, {
                                        encoding: "utf8"
                                    })).contents);
                                } else {
                                    next();
                                }
                            } else {
                                next();
                            }
                        });
                        return middlewares;
                    }
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-connect');
};