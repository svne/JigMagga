module.exports = function (grunt) {
    "use strict";


    var fs = require("fs");

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
                            default: function () {
                                // TODO: step through all folders, searching for a folder with page/page.conf inside. this should be a json file and should contain value for "namespace". Give the first one you find as the default
                                return ""
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
                            validate: function (value) {
                                if (!value.match(/^[a-z][\/a-z0-9]*$/i)) {
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
                            config: "generator.domain",
                            type: "list",
                            choices: function () {
                                // TODO print out all domains and domains/pages in the current namespace/page (all with a conf-file inside)
                                return [
                                    {name: "No page", value: "none"},
                                    "default/index"
                                ]
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
                            choices: function () {
                                // TODO print out all domains in the current namespace/page
                                return ["default", "lieferando.de"]
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
                            choices: function () {
                                // TODO print out the namespace"-domain" in all current namespace"/page/"domain/domain.conf
                                return ["lieferando.de"]
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
                                // TODO: if there is a namespace with a index page, jump to the index page in the first domain or in default
                                if (false) {
                                    res.writeHead(301,
                                        {Location: namespace + '/page/' + domain + "/index/index.html"}
                                    );
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

    grunt.registerTask("generator", "Project structure generator", function () {
        require(__dirname + "/generate/generate.js")[grunt.config("generator.template")](grunt.config("generator.namespace"), grunt.config("generator.name"), grunt.config("generator.domain"));
    });

};
