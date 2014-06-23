"use strict";
var fs = require("fs");

var createWalker = require('./generate/walker');
var config = require('./grunt.config');

var walker = createWalker('.', {
    followLinks: false,
    filters: config.coreFolders
});

module.exports = function(grunt) {
    var namespace;


    grunt.initConfig({
        prompt: {
            generate: {
                options: {
                    questions: [
                        {
                            config: "generator.template",
                            type: "list",
                            message: "Please define the type to generate",
                            choices: ["jig", "model", "page", "domain", "locale", "project", "repository"],
                            default: "jig"
                        },
                        {
                            config: "generator.namespace",
                            type: "input",
                            message: "Please set the namespace of the project:",
                            default: function(answer) {
                                if (answer['generator.template'] === 'project') {
                                    return;
                                }
                                // step through all folders, searching for a folder with page/page.conf inside. this should be a json file and should contain value for "namespace". Give the first one you find as the default
                                return walker.getDefaultNamespace();
                            },
                            filter: function (value) {
                                return value.toLowerCase();
                            },
                            validate: function (value) {
                                if (!value.match(/^[a-z][a-z0-9]*$/i)) {
                                    return "Please only use chars and numbers starting with a character";
                                } else {
                                    return true;
                                }
                            }
                        },
                        {
                            config: "generator.name",
                            type: "input",
                            message: "Please define the name:",
                            filter: function (value) {
                                return value.toLowerCase();
                            },
                            validate: function(value) {
                                if (!value.match(/^[a-z][\/a-z0-9.]*$/i)) {
                                    return "Please only use chars and numbers starting with a character";
                                } else {
                                    return true;
                                }
                            },
                            when: function (answers) {
                                return answers['generator.template'] !== 'project' && answers['generator.template'] !== 'locale';
                            }
                        },
                        {
                            config: "generator.name",
                            type: "input",
                            message: "Please define the locale:",
                            validate: function (value) {
                                if (!value.match(/^[a-z][a-z]_[A-Z][A-Z]$/i)) {
                                    return "Please choose a locale in the form 'xx_XX'";
                                } else {
                                    return true;
                                }
                            },
                            when: function (answers) {
                                return answers['generator.template'] === 'locale';
                            }
                        },
                        {
                            config: "generator.locale",
                            type: "input",
                            message: "Please define the locale:",
                            validate: function (value) {
                                if (!value.match(/^[a-z][a-z]_[A-Z][A-Z]$/i)) {
                                    return "Please choose a first locale in domain in the form 'xx_XX'";
                                } else {
                                    return true;
                                }
                            },
                            when: function (answers) {
                                return answers['generator.template'] === 'domain';
                            }
                        },
                        {
                            config: "generator.domain",
                            type: "list",
                            choices: function(answers) {
                                var result = walker.getAllPagesInDomains(answers['generator.namespace']);
                                // print out all domains and domains/pages in the current namespace/page (all with a conf-file inside)
                                result.unshift({name: "No page", value: "none"});
                                return result;
                            },
                            message: "In which page should the jig be rendered?",
                            filter: function (value) {
                                return value.toLowerCase();
                            },
                            when: function (answers) {
                                return answers['generator.template'] === 'jig';
                            }
                        },
                        {
                            config: "generator.domain",
                            type: "list",
                            choices: function(answers) {
                                // print out all domains in the current namespace/page
                                var result = walker.getAllDomains(answers['generator.namespace']);

                                result.unshift('default');
                                return result;
                            },
                            message: "In which domain should the page be rendered?",
                            filter: function (value) {
                                return value.toLowerCase();
                            },
                            when: function (answers) {
                                return answers['generator.template'] === 'page';
                            }
                        },
                        {
                            config: "generator.domain",
                            type: "list",
                            choices: function(answers) {
                                // print out the namespace"-domain" in all current namespace"/page/"domain/domain.conf
                                var result = walker.getAllNamespaceDomain(answers['generator.namespace']);
                                return result;
                            },
                            message: "For which domain is this locale?",
                            filter: function (value) {
                                return value.toLowerCase();
                            },
                            when: function (answers) {
                                return answers['generator.template'] === 'locale';
                            }
                        }
                    ]
                }
            }
        },
        connect: {
            server: {
                options: {
                    keepalive: true,
                    open: true,
                    middleware:  function (connect, options, middlewares) {
                        // inject a custom middleware into the array of default middlewares
                        middlewares.unshift(function (req, res, next) {
                            if (req.url === "/") {
                                // if there is a namespace with a index page, jump to the index page in the first domain or in default
                                var deafultIndex = walker.getIndexPage();

                                if (deafultIndex) {
                                    res.writeHead(301, {Location: deafultIndex});
                                } else {
                                    // if no index file is generated yet, print out the README.md
                                    require('marked')(fs.readFileSync("./README.md", {encoding: "utf8"}), function (err, html) {
                                        if (err) {
                                            grunt.log.error("README.md can't be rendered");
                                        } else {
                                            res.end(html);
                                        }
                                    });
                                }
                                res.end();
                            } else if (req.url && req.url.search(/\.[s]{0,1}html/) !== -1) {
                                var filename = options.base[0] + req.url,
                                    defaultBase = filename.replace(/\/page\/[^\/]*\//, '/page/default/');
                                if (fs.existsSync(filename)) {
                                    res.end(fs.readFileSync(filename, {encoding: "utf8"}));
                                } else if (fs.existsSync(defaultBase)) {
                                    res.end(fs.readFileSync(defaultBase, {encoding: "utf8"}));

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
    grunt.loadNpmTasks('grunt-prompt');

    grunt.registerTask('generate',
        [
            'prompt:generate',
            'generator'
        ]);


    grunt.registerTask('test', "Test all files that have a funcunit.html file", function(){
        var async = this.async(),
            spawn = require('child_process').spawn,
            testem = spawn(__dirname + '/node_modules/testem/testem.js', {
                stdio : "inherit"
            });
    });

    grunt.registerTask("generator", "Project structure generator", function() {
        var generate = require(__dirname + "/generate/generate");

        generate[grunt.config("generator.template")].call(this, grunt.config("generator.namespace"),
            grunt.config("generator.name"), grunt.config("generator.domain") || grunt.config("generator.locale"));
    });

};
