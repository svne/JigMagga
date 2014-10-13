if (!steal.config("isBuild")) {

    steal('./sass-helper.js', "jquery", 'can/util', (function() {
        "use strict";
        // don't compile SASS when testing
        return !steal.config("isTest") ? {
            id: "./sass.min.js",
            "ignore": true
        } : "jquery";
    }()), function(helper) {
        "use strict";

        var importMatch = /\@import\s+['"]([^'"]+)['"]/gm,
            config = steal.config(steal.config("namespace")),
            sassSteal = config.sass;

        steal(config["sass-transform-fn-path"] || "jquery", function(sassTransform) {

            steal.type("scss css", function(options, success, error) {

                var compileCallback = function() {
                        if (config.sassCompileClient) {
                            options.text = Sass.compile(options.text);
                            success();
                        } else {
                            $.ajax({
                                url: "/sass/compile",
                                type: "POST",
                                data: {
                                    scss: options.text
                                },
                                dataType: "text"
                            }).done(function(filetext) {
                                options.text = filetext;
                                success();
                            }).fail(function(e) {
                                console.warn("SASS Compile error ", e);
                                error();
                            });
                        }

                    },
                    getImports = function(text, callback) {
                        var match,
                            matches = [],
                            fileCount = 0;
                        while (match = importMatch.exec(text)) {
                            matches.push(match[1]);
                        }
                        if (matches.length) {
                            fileCount = matches.length;
                            can.each(matches, function(file) {
                                if (Sass.readFile(file)) {
                                    callback();
                                } else {
                                    $.ajax({
                                        url: "/" + file.replace(/\.scss/, "") + ".scss",
                                        dataType: "text"
                                    }).done(function(filetext) {
                                        Sass.writeFile(file, filetext);
                                        getImports(filetext, function() {
                                            fileCount--;
                                            if (!fileCount) {
                                                callback();
                                            }
                                        });
                                    }).fail(function(e) {
                                        console.warn("SASS file not found", file, e);
                                        callback();
                                    });
                                }
                            });
                        } else {
                            callback();
                        }
                    },
                    startCompiling = function(sassTransform) {
                        options.text = helper.sassImportFn(sassSteal, sassTransform) + options.text;
                        if (config.sassCompileBrowser) {
                            getImports(options.text, compileCallback);
                        } else {
                            compileCallback();
                        }
                    }

                if (config["sass-transform-fn-path"]) {
                    startCompiling(sassTransform);
                } else {
                    startCompiling(null);
                }
            });

        });
    });
}