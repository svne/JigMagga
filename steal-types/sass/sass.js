if (!steal.config("isBuild")) {

    steal('./sass-helper.js', "jquery", 'can/util',
        (function () {
            "use strict";
            // don't compile SASS when testing
            return !steal.config("isTest") ? {id: "./sass.min.js", "ignore": true} : "jquery";
        }()), function (helper) {
            "use strict";
            "use strict";

            var importMatch = /\@import\s+['"]([^'"]+)['"]/gm,
                sassSteal = steal.config(steal.config("namespace")).sass,
                path = steal.config("pathToBuild") || window.location.href,
                page = path.replace(/.*yd\/page\/[^/]*\//, "").replace(/\/.*/, "");

            steal.type("text", function (options, success, error) {
                if (options.type === "scss") {
                    $.ajax({
                        url: "/" + options.id.path,
                        data: {
                            page: page,
                            domain: sassSteal["yd-domain"],
                            locale: sassSteal["yd-locale"]
                        },
                        dataType: "text",
                        success: function (text, status, jqXHR) {
                            options.text = text;
                            if (jqXHR && jqXHR.getResponseHeader("iscss")) {
                                options.isCSS = true;
                            }
                            success(text);
                        },
                        error: error
                    });
                } else {
                    steal.request(options, function (text) {
                        options.text = text;
                        success(text);
                    }, error)
                }
            });


            steal.type("scss css", function (options, success, error) {

                var compileCallback = function () {
                        options.text = Sass.compile(options.text);
                        success();
                    },
                    getImports = function (text, callback) {
                        var match,
                            matches = [],
                            fileCount = 0;
                        while (match = importMatch.exec(text)) {
                            matches.push(match[1]);
                        }
                        if (matches.length) {
                            fileCount = matches.length;
                            can.each(matches, function (file) {
                                if (Sass.readFile(file)) {
                                    callback();
                                } else {
                                    $.ajax({
                                            url: "/" + file.replace(/\.scss/, "") + ".scss",
                                            dataType: "text",
                                            data: {
                                                page: page,
                                                domain: sassSteal["yd-domain"],
                                                locale: sassSteal["yd-locale"]
                                            }
                                        }
                                    ).done(function (filetext) {
                                            Sass.writeFile(file, filetext);
                                            getImports(filetext, function () {
                                                fileCount--;
                                                if (!fileCount) {
                                                    callback();
                                                }
                                            });
                                        }).fail(function (e) {
                                            console.warn("SASS file not found", file, e);
                                            callback();
                                        });
                                }
                            });
                        } else {
                            callback();
                        }
                    };

                if (!options.isCSS) {
                    options.text = helper.sassImportFn(sassSteal) + options.text;
                    getImports(options.text, compileCallback);
                } else {
                    success();
                }


            });
        });
}