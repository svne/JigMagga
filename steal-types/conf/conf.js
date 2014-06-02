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
                    i,
                    len,
                    version = $browser.version,
                    browserconf = jig.browser;
                //noinspection JSLint
                for (k in browserconf) {
                    //noinspection JSLint
                    if (k && k in $browser && browserconf[k].version) {
                        versionconf = browserconf[k].version;
                        //noinspection JSLint
                        for (var key in  versionconf) {
                            if (version.search(versionconf[key]) !== -1) {
                                if (browserconf[k].controller && jig.path) {
                                    jig.path = browserconf[k].controller.toLowerCase().replace(/\./g, "/");
                                } else {
                                    jig = undefined;
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
            var browser = window.$ ? window.$.browser : steal.config("browser");
            if (config && browser && config.browserincludes) {
                for (var key in config.browserincludes) {
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
         * @param jig
         * @param section
         * @returns {*}
         */
        renderJig = function (jig, section) {
            var stealconf = steal.config(),
                path;
            if (steal.config("isBuild") && jig && jig.render === false && section !== "head") {
                if (jig.css !== false) {
                    path = jig.controller.toLowerCase().replace(/\./g, "/");
                    path = path + "/css/" + path.split("/").pop(-1) + ".scss";
                    jig.css = path;
                    jig.controller = false;
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
                    if (typeof (config.jigs[key]
                        ) === "string") {
                        config.jigs[key] = {"controller": config.jigs[key]};
                    }
                    if (!steal.config("isBuild") || !config.jigs[key].disabled) {
                        if (!config.jigs[key].path && config.jigs[key].controller) {
                            config.jigs[key].path = config.jigs[key].controller.toLowerCase().replace(/\./g, "/");
                        }
                        if (config.jigs[key].sass) {
                            for (var i in config.jigs[key].sass) {
                                steal.Yd.sass[config.jigs[key].controller.toLowerCase().replace(/\./g, "-") + "-" + i] = config.jigs[key].sass[i];
                            }
                        }
                        if (config.jigs[key].slot) {
                            var section = document.getElementById(key.substr(1)),
                                jig = config.jigs[key],
                                classes = jig.slot.classes || [],
                                grid = jig.slot.grid;
                            classes.push(jig.controller.toLowerCase().replace(/\./g, "-"));
                            if (grid) {
                                classes.push("yd-grid-" + (grid < 10 ? "0" : "") + grid);
                            }
                            section.className = classes.join(" ");
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
                        }
                        if (config.jigs[key].css) {
                            config.jigs[key].options.css = "//" + config.jigs[key].css;
                        }
                        config.jigs[key] = browserSupport(config.jigs[key]);
                        config.jigs[key] = renderJig(config.jigs[key], key);
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
                        if (config.jigs[key] && config.jigs[key].render) {
                            if (config.jigs[key].path) {
                                config.includes.push(config.jigs[key].path);
                            }
                            if (config.jigs[key].template) {
                                config.includes.push(config.jigs[key].template);
                            }
                        } else {
                            delete config.jigs[key];
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
                        for (var key in domainconfig.jigs) {
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
                        for (var key in pageconfig.jigs) {
                            if (config.jigs[key]) {
                                if (typeof (config.jigs[key]
                                    ) === "string") {
                                    config.jigs[key] = {"controller": config.jigs[key]};
                                }
                                if (typeof (pageconfig.jigs[key]
                                    ) === "string") {
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
         * process a config
         * @param options
         * @param config
         * @param success
         * @param error
         */
        processConfig = function (options, config, success, error) {


            steal.Yd = steal.Yd || {};
            // for js buidling
            options.putDependenciesAfterThisModuleForBuild = true;

            if (steal.config("isBuild")) {
                config = removeDevelopOptionsFromConfig(config);
            }

            if (config.sass) {
                steal.Yd.sass = config.sass;
            }


            prepareDomainAndPageConfig(config);
            prepareConfigJigs(config);


            if (steal.config("isBuild")) {
                config.includes.unshift("yd/core/error-logger.js"); // Errorlogger

                if (config.tracking) {
                    config.includes.push('yd/tracking'); // Tracking
                }

            }

            // include all browser specify stuff
            browserIncludes(config);

            config.includes.unshift("yd/core/jQuery/plugins/support/support.js");
            config.includes.push("yd/core/browsercompatibility.js"); // IE fixes


            options.text = "if(typeof window === 'undefined'){ window = {};};\n" +
                "window.Yd = window.Yd || {};\n" +
                "Yd = window.Yd;\n" +
                "window.Yd.predefined = window.Yd.predefined || {};\n" +
                "window.Yd.request = window.Yd.request || {};\n" +
                "window.Yd.config = " + JSON.stringify(config) + ";\n";
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

                if (config.tracking && !steal.config("isTest")) {
                    var trackingOptions = {};
                    trackingOptions.tracking = config.tracking;
                    options.text += "\nsteal( 'yd/tracking' , function(){";
                    options.text += "\nnew Yd.Tracking(\"body\", " + JSON.stringify(trackingOptions) + ");";
                    options.text += "\n});";

                }
                options.text += "steal('yd/core/liveconfig', function(){\n";
                // initialize global config
                options.text += "\nYd.Liveconfig.load();";
                options.text += "});\n";


                if ((config.jigs && !isEmptyObject(config.jigs)) || config.tracking) {
                    options.text += "steal('can/route',";


                    if (config.jigs && !isEmptyObject(config.jigs)) {
                        for (key in config.jigs) {
                            if (config.jigs[key].controller && !config.jigs[key].disabled) {
                                options.text += "'" + config.jigs[key].path + "', ";
                            }
                        }
                    }
                    options.text += "function(){";


                    options.text += "\ncontentLoaded(window, function(){";
                    options.text += "\nvar routeInit = false;";
                    options.text += "\ndocument.body.className = document.body.className.replace(/\\byd-onload\\b/,'');";
                    options.text += "\ncan.support.cors = true;";
                    options.text += "\nif(routeInit){return false;} routeInit = true;";
                    // init all routes and trigger ready
                    options.text += "\ncan.route.ydReady = can.Deferred();";
                    if (config.jigs && !isEmptyObject(config.jigs)) {
                        for (key in config.jigs) {
                            if (config.jigs[key].options && config.jigs[key].options.routes) {
                                for (var routesKey in config.jigs[key].options.routes) {
                                    options.text += "\ncan.route('" + routesKey + "', " + JSON.stringify(config.jigs[key].options.routes[routesKey]) + ");";
                                }
                            }
                        }
                    }


                    // write jigs and steal dependencies


                    if (config.jigs && !isEmptyObject(config.jigs)) {

                        for (key in config.jigs) {
                            if (config.jigs[key].controller && !config.jigs[key].disabled) {
                                options.text += "\nnew " + config.jigs[key].controller + "(\"" + key + "\", " + JSON.stringify(config.jigs[key].options) + ");";
                            }
                        }
                        options.text += "\ncan.route.ready();";
                        options.text += "\ncan.route.ydReady.resolve();";
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
                isTest = steal.config("isTest");


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
                if(isTest && configs[i] && !configs[i].testConf){
                    delete configs[i].jigs;
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
                    if (steal.config("isBuild")) {
                        var fs = require("fs");
                        try {
                            var content = fs.readFileSync(path.substring(1, path.length), {encoding: "utf8"});
                        } catch (e) {
                            console.log("Warning: no .conf file:", path.substring(1, path.length));
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
            setConfigs(path.replace(/yd\/page\/[^/]*/, "yd/page/default"));
            setConfigs(path);
            return configs;
        },
        getPath = function () {
            if(steal.config("pathToBuild")){
                return steal.config("pathToBuild");
            }else if(window.location){
                return window.location.pathname;
            }else{
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
                throw new Error("No domain in path / url - do not use default url");
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
        setSassVariables = function(conf){
            conf.sass = conf.sass || {};

            if(!conf["yd-domain"]){
                throw new Error("Domain is not set in config (yd-domain)");
            }
            if(!conf.locale){
                throw new Error("Locale is not set in config (locale)");
            }

            conf.sass["yd-domain"] = conf["yd-domain"].replace(/\./g, "_");
            conf.sass["yd-locale"] = conf.locale;
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
            // get domain
            domain = getDomain();
            if (domain) {
                config.domain = domain;
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

                if (!mergedConfig["yd-domain"]) {
                    mergedConfig["yd-domain"] = config.domain;
                }

                // set local
                mergedConfig.locale = steal.config("init-locale") || steal.config().env === 'development' && !steal.config("isBuild") && readCookie("yd-dev-locale") || mergedConfig["init-locale"] || mergedConfig.locales[0];

                mergedConfig.includes.unshift("//yd/core/sprintf.js");
                mergedConfig.includes.unshift("//yd/locales/" + mergedConfig["yd-domain"] + "/" + mergedConfig.locale + "/messages.po");


                mergedConfig = setSassVariables(mergedConfig);

                processConfig(options, mergedConfig, success, error);
            });
        });
    }


    if(typeof module !== 'undefined' && module.exports){
        module.exports = {
            setSassVariables : setSassVariables
        };
    }

}(this.window || {});

