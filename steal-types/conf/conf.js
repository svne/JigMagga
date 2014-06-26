!function (window) {
    /**
     * global time getter function
     * @param win
     * @constructor
     */
    var GlobalTimeFunction = function (win) {
            window.ydDate = function () {
                return new win.Date();
            };
            var timezoneCache = {};
            var getTimezoneOffsetFromGMT = function (date, config) {
                if (config && config.timezone) {
                    if (!timezoneCache[+date]) {
                        var offsetHoursFromGMT = config.timezone.defaultOffset,
                            timezone = (config && config.timezone && config.timezone[date.getFullYear()]
                                ) || false;
                        if (timezone && (+date
                            ) >= timezone.from && (+date
                            ) <= timezone.to) {
                            offsetHoursFromGMT = config.timezone[date.getFullYear()].offset;
                        }
                        timezoneCache[+date] = offsetHoursFromGMT;
                        return offsetHoursFromGMT;
                    } else {
                        return  timezoneCache[+date];
                    }
                }
                return new Date().getTimezoneOffset();
            };
            steal('jquery', function () {
                var _serverDate,
                    _startDate;
                Date.prototype.ydDateDiff = function () {
                    var diffTime = new win.Date().getTime() - new win.Date(_serverDate || new win.Date()).getTime();
                    return !(diffTime > -150000 && diffTime < 150000
                        );
                };
                window.ydDate = function () {
                    var date = new win.Date(), offsetHoursFromGMT;
                    if (_serverDate) {
                        date = new win.Date(_serverDate);
                        offsetHoursFromGMT = getTimezoneOffsetFromGMT(date, (win && win.Yd ? win.Yd.config : undefined
                            ));
                        date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + offsetHoursFromGMT);
                        date.setMilliseconds(date.getMilliseconds() + (new win.Date().getTime() - _startDate.getTime()
                            ));
                    } else {
                        date = new win.Date();
                    }
                    return date;
                };
                (function () {
                    $.ajax({
                        type: 'HEAD',
                        url: win.location.href,
                        cache: false,
                        success: function (msg, b, c) {
                            _startDate = new win.Date();
                            _serverDate = c.getResponseHeader('Date');
                            if (win.ydDate().ydDateDiff()) {
                                $(win).trigger('serverTimeArrived');
                            }
                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            steal.dev.log(jqXHR);
                            steal.dev.log(errorThrown);
                        }
                    });
                })();
            });
        },
        /**
         * will remove a jig when browser is not supported
         * @param jig
         * @returns {*}
         */
        browserSupport = function (jig) {
            if (jig && jig.browser && (window.$ || (steal.config("isBuild") && steal.config("browser")))) {
                var $browser = window.$ ? window.$.browser : steal.config("browser"),
                    versionconf,
                    k,
                    key
                version = $browser.version,
                    browserconf = jig.browser;
                //noinspection JSLint
                for (k in browserconf) {
                    //noinspection JSLint
                    if (k && k in $browser && browserconf[k].version) {
                        versionconf = browserconf[k].version;
                        //noinspection JSLint
                        for (key in versionconf) {
                            if (version.search(versionconf[key]) !== -1) {
                                if (browserconf[k].controller && jig.path) {
                                    jig.path = browserconf[k].controller.toLowerCase().replace(/\./g, "/");
                                } else {
                                    jig.disable = true;
                                }
                                break;
                            }
                        }
                    }
                }
            }
            return jig;
        },
        /**
         * will include the browser stuff
         * @param config
         */
        browserIncludes = function (config) {
            var key,
                browser = window.$ ? window.$.browser : steal.config("browser");
            if (config && browser && config.browserincludes) {
                for (key in config.browserincludes) {
                    if (key in browser) {
                        for (var includeKey in config.browserincludes[key]) {
                            config.includes.push(config.browserincludes[key][includeKey]);
                        }
                    }
                }
            }
        },
        /**
         * cross browser DOM ready function
         * @param win
         * @param fn
         */
        contentLoaded = function (win, fn) {
            var done = false, top = true,
                doc = win.document, root = doc.documentElement,
                add = doc.addEventListener ? 'addEventListener' : 'attachEvent',
                rem = doc.addEventListener ? 'removeEventListener' : 'detachEvent',
                pre = doc.addEventListener ? '' : 'on',
                init = function (e) {
                    if (e.type == 'readystatechange' && doc.readyState != 'complete') return;
                    (e.type == 'load' ? win : doc
                        )[rem](pre + e.type, init, false);
                    if (!done && (done = true
                        )) fn.call(win, e.type || e);
                },
                poll = function () {
                    try {
                        root.doScroll('left');
                    } catch (e) {
                        setTimeout(poll, 50);
                        return;
                    }
                    init('poll');
                };
            if (doc.readyState == 'complete') fn.call(win, 'lazy');
            else {
                if (doc.createEventObject && root.doScroll) {
                    try {
                        top = !win.frameElement;
                    } catch (e) {
                    }
                    if (top) poll();
                }
                doc[add](pre + 'DOMContentLoaded', init, false);
                doc[add](pre + 'readystatechange', init, false);
                win[add](pre + 'load', init, false);
            }
        },
        /**
         * check if jig config has render === false
         * if so only css/scss will include and JS is remove
         * checks also if includeController then jig will include js but is not alloc by conf
         * @param jig
         * @param section
         * @returns {*}
         */
        renderJig = function (jig, section, config) {
            if (jig && jig.render === false && section !== "head") {
                var path = jig.controller.toLowerCase().replace(/\./g, "/");
                if (jig.css !== false) {
                    jig.css = path + "/css/" + path.split("/").pop(-1) + ".scss";
                }
                if (jig.includeController || !steal.config("isBuild")) {
                    config.includes.push(path);
                }
            } else if (jig) {
                jig.render = true;
            }
            return jig;
        },
        /**
         * do not include develop option in config
         * @param config
         * @returns {*}
         */
        removeDevelopOptionsFromConfig = function (config) {
            delete config.developConfig;
            return config;
        },
        /**
         * prepare all jigs for final config
         * @param config
         */
        prepareConfigJigs = function (config) {
            var key;
            if (config.jigs && !isEmptyObject(config.jigs)) {
                //noinspection JSLint
                for (key in config.jigs) {
                    //noinspection JSUnfilteredForInLoop
                    //TODO replace all short written config controller because we do not now if it is ejs or mustache
                    if (typeof (config.jigs[key]) === "string") {
                        config.jigs[key] = {"controller": config.jigs[key]};
                    }
                    if (!steal.config("isBuild") || !config.jigs[key].disabled) {
                        if (!config.jigs[key].path && config.jigs[key].controller) {
                            config.jigs[key].path = config.jigs[key].controller.toLowerCase().replace(/\./g, "/");
                        }
                        if (config.jigs[key].sass) {
                            for (var i in config.jigs[key].sass) {
                                if (config.jigs[key].controller) {
                                    steal.Yd.sass[config.jigs[key].controller.toLowerCase().replace(/\./g, "-") + "-" + i] = config.jigs[key].sass[i];
                                }
                            }
                        }
                        config.jigs[key].options = config.jigs[key].options || {};
                        if (config.jigs[key].template) {
                            if (typeof config.jigs[key].template === "object") {
                                if (config.jigs[key].template[config.locale]) {
                                    config.jigs[key].options.template = "//" + config.jigs[key].template[config.locale];
                                } else {
                                    config.jigs[key].options.template = "//" + config.jigs[key].template[Object.keys(config.jigs[key].template)[0]];
                                }
                            } else {
                                config.jigs[key].options.template = "//" + config.jigs[key].template;
                            }
                        } else {
                            config.jigs[key].options.template = "//" + config.jigs[key].controller.toLowerCase().replace(/\./g, "/") + "/views/init.ejs";
                            console.warn("Missing template for Controller: ", config.jigs[key].controller, " ", "//" + config.jigs[key].controller.toLowerCase().replace(/\./g, "/") + "/views/init.ejs");
                        }
                        if (config.jigs[key].css) {
                            config.jigs[key].options.css = "//" + config.jigs[key].css;
                        }
                        //config.jigs[key] = browserSupport(config.jigs[key]);
                        config.jigs[key] = renderJig(config.jigs[key], key, config);
                        /**
                         * check if jig has includes that are config special
                         */
                        if (config.jigs[key] && config.jigs[key].includes) {
                            if (typeof config.jigs[key].includes === "string") {
                                config.includes.push(config.jigs[key].includes);
                            } else if (config.jigs[key].includes.length) {
                                config.includes = config.includes.concat(config.jigs[key].includes);
                            }
                        }
                        if (config.jigs[key] && config.jigs[key].css) {
                            config.includes.push(config.jigs[key].css);
                        }
                        if (config.jigs[key].template) {
                            if (typeof config.jigs[key].template === "object") {
                                if (config.jigs[key].template[config.locale]) {
                                    config.includes.push("//" + config.jigs[key].template[config.locale]);
                                } else {
                                    config.includes.push("//" + config.jigs[key].template[Object.keys(config.jigs[key].template)[0]]);
                                }
                            } else {
                                config.includes.push(config.jigs[key].template);
                            }
                        }
                        // include controller
                        if (config.jigs[key] && config.jigs[key].render) {
                            if (config.jigs[key].path) {
                                config.includes.push(config.jigs[key].path);
                            }
                        }
                    }
                }
            }
        },
        /**
         * prepare domain and page config
         * @param config
         */
        prepareDomainAndPageConfig = function (config) {
            var key,
                pageconfig,
                domainconfig;
            if (config["domain-pages"] && config["domain-pages"][config["domain"]]) {
                domainconfig = config["domain-pages"][config["domain"]];
                if (domainconfig.includes && domainconfig.includes.length) {
                    if (config.includes && config.includes.length) {
                        config.includes = config.includes.concat(domainconfig.includes);
                    } else {
                        config.includes = domainconfig.includes;
                    }
                }
                if (domainconfig.jigs && !isEmptyObject(domainconfig)) {
                    if (config.jigs && !isEmptyObject(config.jigs)) {
                        for (key in domainconfig.jigs) {
                            if (config.jigs[key]) {
                                if (typeof (config.jigs[key]
                                    ) === "string") {
                                    config.jigs[key] = {"controller": config.jigs[key]};
                                }
                                if (typeof (domainconfig.jigs[key]
                                    ) === "string") {
                                    config.jigs[key].controller = domainconfig.jigs[key];
                                } else {
                                    config.jigs[key] = extend(config.jigs[key], domainconfig.jigs[key]);
                                }
                            } else {
                                config.jigs[key] = domainconfig.jigs[key];
                            }
                        }
                    } else {
                        config.jigs = domainconfig.jigs;
                    }
                }
            }
            if (config["init-page"] && config["child-pages"] && config["child-pages"][config["init-page"]]) {
                pageconfig = config["child-pages"][config["init-page"]];
                if (pageconfig.includes && pageconfig.includes.length) {
                    if (config.includes && config.includes.length) {
                        config.includes = config.includes.concat(pageconfig.includes);
                    } else {
                        config.includes = pageconfig.includes;
                    }
                }
                if (pageconfig["child-page-path"]) {
                    config["child-page-path"] = pageconfig["child-page-path"];
                }
                if (pageconfig.jigs && !isEmptyObject(pageconfig)) {
                    if (config.jigs && !isEmptyObject(config.jigs)) {
                        for (key in pageconfig.jigs) {
                            if (config.jigs[key]) {
                                if (typeof (config.jigs[key]) === "string") {
                                    config.jigs[key] = {"controller": config.jigs[key]};
                                }
                                if (typeof (pageconfig.jigs[key]) === "string") {
                                    config.jigs[key].controller = pageconfig.jigs[key];
                                } else {
                                    config.jigs[key] = extend(config.jigs[key], pageconfig.jigs[key]);
                                }
                            } else {
                                config.jigs[key] = pageconfig.jigs[key];
                            }
                        }
                    } else {
                        config.jigs = pageconfig.jigs;
                    }
                }
            }
        },
        /**
         * retruns the string to alloc a jig
         * @param key
         * @param jig
         * @returns {string}
         */
        allocateJig = function (key, jig) {
            return "\nnew " + jig.controller + "(\"" + key + "\", " + JSON.stringify(jig.options) + ");";
        },
        /**
         * Disabled jig is:
         * ---------------------------------------------
         * render === false && steal.config("isBuild")
         * disabled === true
         * controller === false
         * includeController === true && render === false
         * ----------------------------------------------
         * @param jig
         * @returns {boolean}
         */
        hasJigControllerAndIsNotDisabled = function (jig) {
            return !!(jig.controller && !jig.disabled && !(jig.includeController && !jig.render) && !(steal.config("isBuild") && !jig.render));
        },
        /**
         * returns a string of all routes that must be include
         * @param config
         * @returns {string}
         */
        writeJigRoutes = function (config) {
            var key,
                routesKey,
                text = "";
            if (config.jigs && !isEmptyObject(config.jigs)) {
                for (key in config.jigs) {
                    if (config.jigs[key].options && config.jigs[key].options.routes) {
                        for (routesKey in config.jigs[key].options.routes) {
                            text += "\ncan.route('" + routesKey + "', " + JSON.stringify(config.jigs[key].options.routes[routesKey]) + ");";
                        }
                    }
                }
            }
            return text;
        },
        /**
         * only render template when this is no js build in live the worker has rendered the template
         * important can/view must be loaded before
         * @param config
         * @param cb -> fn callback
         */
        renderTemplatesFromNonControllerJigs = function (config, cb) {

            if (!steal.config("isBuild")) {
                var key,
                    text = "",
                    templatefn = function (key, jig) {
                        return  "document.querySelector('" + key + "').appendChild(can.view('" + jig.template + "', " + JSON.stringify(jig.options) + "));\n";
                    };
                for (key in config.jigs) {
                    // render jigs with important flag before other jigs
                    if (config.jigs[key].controller === false && config.jigs[key].template && config.jigs[key].important && !config.jigs[key].disabled) {
                        text += templatefn(key, config.jigs[key]);
                    }
                }
                for (key in config.jigs) {
                    // render jigs with non important flag after jigs with important
                    if (config.jigs[key].controller === false && config.jigs[key].template && !config.jigs[key].important && !config.jigs[key].disabled) {
                        text += templatefn(key, config.jigs[key]);
                    }
                }
                cb(text);
            } else {
                cb("");
            }
        },
        /**
         * check jig config for slot logic and execute ist
         * eg.
         *  "slot" : {
         *
         *      "parent" : ".yd-parent",
         *      "insertAsChild": "prepend" || "append",
         *      "classes" : ["class"]
         *
         * }
         *
         * @param key
         * @param jig
         */
        executeJigSlotLogic = function (key, jig) {
            if (jig.slot && !steal.config("isBuild")) {
                var section = document.querySelector(key),
                    classWithoutDot = key.replace(/^\./, ""),
                    parent;
                jig.slot = jig.slot === true ? {} : jig.slot;
                jig.slot.classes = jig.slot.classes || [];
                if (jig.controller) {
                    jig.slot.classes.push(jig.controller.toLowerCase().replace(/\./g, "-"));
                }
                // add section
                if (jig.slot.parent) {
                    section = document.createElement("section");
                    if (jig.slot.classes.indexOf(classWithoutDot) === -1) {
                        jig.slot.classes.push(classWithoutDot);
                    }
                    section.className = jig.slot.classes.join(" ");
                    parent = document.querySelector(jig.slot.parent);
                    if (parent) {
                        if (jig.slot.insertAsChild === "prepend") {
                            parent.insertBefore(section, parent.firstChild);
                        } else {
                            parent.appendChild(section);
                        }
                    } else {
                        console.warn("Jig slot parent not found!");
                    }
                }
                // section exists but class will be add
                else if (section) {
                    section.className = section.className + " " + jig.slot.classes.join(" ");
                } else {
                    console.warn("Jig slot no parent or no section found!");
                }
            }
        },
        /**
         * process a config
         * MAIN Function
         * @param options
         * @param config
         * @param success
         * @param error
         */
        processConfig = function (options, config, success, error) {


            steal.Yd = steal.Yd || {};
            // for js building
            options.putDependenciesAfterThisModuleForBuild = true;

            if (steal.config("isBuild")) {
                config = removeDevelopOptionsFromConfig(config);
            }

            if (config.sass) {
                steal.Yd.sass = config.sass;
            }

            prepareDomainAndPageConfig(config);
            prepareConfigJigs(config);

            /**
             * TODO write functions for every jig action or prepare and split code to cleanup and make js testable
             * @type {Array}
             */
            var jigsKeys = Object.keys(config.jigs);
            for (var i = 0; i < jigsKeys.length; i++) {
                executeJigSlotLogic(jigsKeys[i], config.jigs[jigsKeys[i]]);
            }


            // include all browser specify stuff
            browserIncludes(config);

            config.includes.push("lib/lib.js");

            // include all jigs that have IncludeController


            options.text = "if(typeof window === 'undefined'){ window = {};};\n" +
                "window.Yd = window.Yd || {};\n" +
                "Yd = window.Yd;\n" +
                "window.Yd.predefined = window.Yd.predefined || {};\n" +
                "window.Yd.request = window.Yd.request || {};\n" +
                "window.Yd.config = " + JSON.stringify(config) + ";\n" +
                "steal.config('page', window.Yd.config);\n";
            if (config["pagination-limit"]) {
                options.text += "window.Yd.request['pageLimit'] = " + config['pagination-limit'] + ";\n";
            }
            if (!steal.config("isBuild")) {
                if (config["init-pagination-pageNum"]) {
                    options.text += "window.Yd.request['pageNum'] = " + config["init-pagination-pageNum"] + ";\n";
                }
            }


            if (config.includes && config.includes.length) {

                options.text += "\nvar contentLoaded =" + contentLoaded.toString() + ";\n";
                options.text += "\n(" + GlobalTimeFunction.toString() + ")(window);\n";
                steal.apply(steal, config.includes);



                if ((config.jigs && !isEmptyObject(config.jigs)) || config.tracking) {

                    options.text += "steal('can/route', 'can/view',";

                    // write all jig paths to steal that dependencies are loaded before alloc a jig
                    // eg. steal("yd/jig/bla/bla.js", function(){ .....
                    if (config.jigs && !isEmptyObject(config.jigs)) {
                        for (key in config.jigs) {
                            if (hasJigControllerAndIsNotDisabled(config.jigs[key])) {
                                options.text += "'" + config.jigs[key].path + "', ";
                            }
                        }
                    }
                    options.text += "function(){\n";


                    options.text += "\ncontentLoaded(window, function(){\n";
                    options.text += "\nvar routeInit = false;\n";
                    options.text += "\ndocument.body.className = document.body.className.replace(/\\byd-onload\\b/,'');\n";
                    options.text += "\ncan.support.cors = true;\n";
                    options.text += "\nif(routeInit){return false;} routeInit = true;\n";
                    // init all routes and trigger ready
                    options.text += "\ncan.route.ydReady = can.Deferred();\n";

                    // write all routes that jigs have
                    options.text += writeJigRoutes(config);


                    // write jigs and steal dependencies
                    if (config.jigs && !isEmptyObject(config.jigs)) {
                        renderTemplatesFromNonControllerJigs(config, function (text) {
                            options.text += text;
                            for (key in config.jigs) {
                                // render jigs with important flag before other jigs
                                if (config.jigs[key].important && hasJigControllerAndIsNotDisabled(config.jigs[key])) {
                                    options.text += allocateJig(key, config.jigs[key]);
                                }
                            }
                            for (key in config.jigs) {
                                // only render jigs that have a controller and are not disabled and have not the important flag
                                if (hasJigControllerAndIsNotDisabled(config.jigs[key]) && !config.jigs[key].important) {
                                    options.text += allocateJig(key, config.jigs[key]);
                                }
                            }
                            options.text += "\ncan.route.ready();";
                            options.text += "\ncan.route.ydReady.resolve();";
                        });
                    }
                    options.text += "\n});";

                }
                options.text += "});";
                success();
            } else {
                error("No includes or jigs defined");
            }
        },
        mergeConfigs = function (parseconfig, configs) {

            configs.push(parseconfig);

            var config = {
                    includes: []
                },
                includes = [],
                isTest = steal.config("isTest"),
                testJig = steal.config("testJig");


            for (var i = 0; i < configs.length; i++) {
                if (configs[i] && configs[i].includes && configs[i].includes.length) {
                    // check dublicate includes
                    for (var j = 0; j < configs[i].includes.length; j++) {
                        if (includes.indexOf(configs[i].includes[j]) === -1) {
                            includes.push(configs[i].includes[j]);
                        }
                    }
                }
                // check if this is a test and delete all non test jigs
                if (isTest && configs[i]) {
                    if (!configs[i].testConf) {
                        delete configs[i].jigs;
                    } else if (testJig) {
                        for (var key in configs[i].jigs) {
                            if (key !== testJig) {
                                delete configs[i].jigs[key];
                            }
                        }
                    }
                }
                config = extend(config, configs[i]);
            }

            config.includes = includes;

            return config;
        },
        getAllConfigs = function (configs, done) {
            var counter = 0,
                doneResult = [],
                factory = function (path, callback) {
                    if (steal.config("isBuild") && !steal.config("isTest")) {
                        var fs = require("fs");
                        try {
                            var content = fs.readFileSync(steal.config("root") + path.substring(1, path.length), {encoding: "utf8"});
                        } catch (e) {
                            console.warn("No .conf file:", steal.config("root") + path.substring(1, path.length));
                        }
                        callback(content);
                    } else {

                        steal.request({
                            src: path
                        }, function (data) {
                            callback(data)
                        }, function () {
                            callback(undefined);
                        });


                    }
                };
            if (configs && configs.length) {

                for (var index in configs) {
                    !function (i) {
                        factory(configs[i], function (result) {
                            counter++;
                            if (typeof result === "string") {
                                doneResult[i] = JSON.parse(result);
                            }
                            if (counter === configs.length) {
                                done(doneResult);
                            }
                        });
                    }(index);
                }
            } else {
                done(doneResult);
            }
        },
        getConfigPaths = function (path) {
            var configs = [],
            // get all configs that are in folders - we can bubble up the path (default and domain)
                setConfigs = function (path) {
                    var isDefault = path.indexOf("default") !== -1,
                        dirs = path.split("/");
                    for (var i = 0, dir = "", tempPath = "", len = dirs.length; i < len; i++, dir = dirs[i]) {
                        if (dir && dir.indexOf("html") === -1) {
                            tempPath += "/" + dir;
                            if (i > (isDefault ? 1 : 2)) {
                                configs.push(tempPath + "/" + dir + ".conf");
                            }
                        }
                    }
                };
            //TODO use regex that do not require yd/ path and will work with all page paths
            setConfigs(path.replace(/.*\.[a-z]{2,3}\//, "/yd/page/default/"));
            setConfigs(path);
            return configs;
        },
        getPath = function () {
            if (steal.config("pathToBuild")) {
                return steal.config("pathToBuild");
            } else if (window.location) {
                return window.location.pathname;
            } else {
                throw new Error("No path to build is set!");
                return null;
            }
        },
        getDomain = function () {
            var domain = "",
                path = getPath(),
                match = path.match(/\/yd\/page\/([^\/]+)\//);
            if (match) {
                domain = match[1];
            } else {
                domain = "default";
                console.warn("No domain in path / url - use default domain");
            }
            return domain;
        },
        extend = function (/*obj_1, [obj_2], [obj_N]*/) {
            if (arguments.length < 1 || typeof arguments[0] !== 'object') {
                return false;
            }

            if (arguments.length < 2) return arguments[0];

            var target = arguments[0];

            // convert arguments to array and cut off target object
            var args = Array.prototype.slice.call(arguments, 1);

            var key, val, src, clone;

            args.forEach(function (obj) {
                if (typeof obj !== 'object') return;

                for (key in obj) {
                    if (obj[key] !== void 0) {
                        src = target[key];
                        val = obj[key];

                        if (val === target) continue;

                        if (typeof val !== 'object' || val === null) {
                            target[key] = val;
                            continue;
                        }

                        if (typeof src !== 'object') {
                            clone = (Array.isArray(val)) ? [] : {};
                            target[key] = extend(clone, val);
                            continue;
                        }

                        if (Array.isArray(val)) {
                            clone = (Array.isArray(src)) ? src : [];
                        } else {
                            clone = (!Array.isArray(src)) ? src : {};
                        }

                        target[key] = extend(clone, val);
                    }
                }
            });

            return target;
        },
        isEmptyObject = function (obj) {
            var name;
            for (name in obj) {
                return false;
            }
            return true;
        },
        readCookie = function (name) {
            var ck,
                cv,
                i;
            if (document.cookie) {
                ck = document.cookie.split('; ');
                for (i = ck.length - 1; i >= 0; i--) {
                    cv = ck[i].split('=');
                    if (cv[0] === name) {
                        return cv[1];
                    }
                }
            }
            return undefined;
        },
        setSassVariables = function (conf) {
            conf.sass = conf.sass || {};

            if (!conf.domain) {
               console.warn("Domain is not set in config (domain)");
            }
            if (!conf.locale) {
                console.warn("Locale is not set in config (locale)");
            }
            conf.namespace = conf.namespace || "";
            conf.sass[conf.namespace + "-domain"] = conf.domain ? conf.domain.replace(/\./g, "_") : "default";
            conf.sass[conf.namespace + "-locale"] = conf.locale;
            return conf;
        };

    /**
     *
     * Type definition of .conf files
     *
     */

    if (typeof steal !== "undefined") {

        steal.type("conf js", function (options, success, error) {
            var domain,
                stealToUri,
                config = JSON.parse(options.text),
                configs;
            if (!config) {
                error("Config can't be parsed");
            }
            if (!config.includes) {
                config.includes = [];
            }
            // get temp domain from URL after we had a conf we use the domain from conf file
            domain = getDomain();
            if (domain) {
                // replace domain placeholder in paths
                stealToUri = steal.idToUri;
                steal.idToUri = function (id, noJoin) {
                    id.path = id.path.replace(/%DOMAIN%/, domain);
                    return stealToUri(id, noJoin);
                };
            }
            configs = getConfigPaths(getPath());
            getAllConfigs(configs, function (results) {
                var mergedConfig = mergeConfigs(config, results);

                if (!mergedConfig.domain) {
                    mergedConfig.domain = domain;
                }

                // set local
                mergedConfig.locale = steal.config("init-locale") || steal.config().env === 'development' && !steal.config("isBuild") && readCookie("yd-dev-locale") || mergedConfig["init-locale"] || (mergedConfig.locales && mergedConfig.locales[0]) || "default";

                mergedConfig.includes.unshift((mergedConfig.namespace || "") + "/locales/" + mergedConfig.domain + "/" + mergedConfig.locale + "/messages.po");


                mergedConfig = setSassVariables(mergedConfig);


                processConfig(options, mergedConfig, success, error);
            });
        });
    }


    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            setSassVariables: setSassVariables
        };
    }

}(this.window || {});

