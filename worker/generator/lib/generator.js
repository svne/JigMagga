'use strict';

/**
 * Created with JetBrains WebStorm.
 * User: ydadmin
 * Date: 04.02.13
 * Time: 18:42
 * To change this template use File | Settings | File Templates.
 */

var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var async = require('async');
var util = require('util');
var deepExtend = require('deep-extend');
var path = require('path');
var ejs = require("ejs");
var mustache = require('mustache');
var viewHelper = require("./view.js");
var restHelper = require("./rest.js");
var placeholderHelper = require("./placeholders.js");
var slots = require('./slots');
var http = require('http-get');
var _ = require('lodash');
var Q = require('q');
var Uploader = require('jmUtil').ydUploader;
var zlib = require('zlib');
var md5 = require('MD5');
var gt;
var pageCounter = 0;
var knoxConfig;
var saveDiskPath;

function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

var childPageUploadUrl = function (config) {
    var childUrl = '';
    if (config['child-page-path']) {
        for (var i = 0, l = config['child-page-path'].length; i < l; i++) {
            if (config['child-page-path'][i].url) {
                childUrl += '/' + gt._(config['child-page-path'][i].url);
            } else if (i === 0) {
                childUrl += config.pages[config.viewContainer.page][config.locale].replace('{url}', config.url);

            }
        }
        config.uploadUrl = childUrl;
    }
    return config;
};

/**
 * returns a list of api call names the result of which should not be included
 * in to the predefined object. The apicall included to the list if all it has render property that
 * equal false in all jigs.
 *
 * @param {object} jigs
 * @return {array}
 */
var getExcludedPredefinedVariables = function (jigs) {
    var apiCallJigs = _.filter(_.keys(jigs), function (jigName) {
        return jigs[jigName].apicalls;
    });
    var apiCallsWithJigs = {};

    _.each(apiCallJigs, function (jigName) {
        var jig = jigs[jigName];
        _.each(jig.apicalls, function (apiCall, apiCallName) {
            if (!apiCallsWithJigs[apiCallName]) {
                apiCallsWithJigs[apiCallName] = [];
            }
            apiCallsWithJigs[apiCallName].push(jig);
        });
    });

    return _.filter(_.keys(apiCallsWithJigs), function (apiCallName) {
        var jigs = apiCallsWithJigs[apiCallName];
        return _.every(jigs, function (jig) {
            return jig.render === false;
        });
    });
};

/**
 * generates script tags with path of production script in the src
 *
 * @param  {string} namespace
 * @param  {array}  browsers
 * @param  {string}  scriptName
 * @return {string}
 */
var generateProductionScriptTags = function (namespace, browsers, scriptName) {
    var result = '',
        nonIE = '<!--[if !IE]> --><script id="%s-application-script" type="text/javascript" src="/%s"></script><!-- <![endif]-->',
        IE = '<!--[if IE %d]><script id="%s-application-script-ie%d" type="text/javascript" src="/%s"></script><![endif]-->';

    result = util.format(nonIE, namespace, scriptName);
    if (!browsers) {
        return result;
    }

    browsers.forEach(function (item) {
        if (!item.msie) {
           return result += util.format(nonIE, namespace, scriptName);
        }
        var version = Number(item.version);
        var ieScriptName = scriptName.replace('/production-', '/production-msie' + item.version + '-');

        result += util.format(IE, version, namespace, version, ieScriptName);
    });

    return result;
};

/**
 * generates link tags with path to production css styles in the href
 * @param  {array} browsers
 * @param  {string} scriptName
 * @return {string}
 */
var generateProductionStyleTags = function (browsers, scriptName) {
    var styleName = scriptName.replace(/js$/i, 'css'),
        result = '',
        nonIE = '<!--[if !IE]> --><link rel="stylesheet" type="text/css" href="/%s" /> <!-- <![endif]-->',
        IE = '<!--[if IE %d]><link rel="stylesheet" type="text/css" href="/%s" /><![endif]-->';

    result = util.format(nonIE, styleName);
    if (!browsers) {
        return result;
    }

    browsers.forEach(function (item) {
        if (!item.msie) {
           return result += util.format(nonIE, styleName);
        }
        var version = Number(item.version);
        var ieStyleName = styleName.replace('/production-', '/production-msie' + item.version + '-');

        result += util.format(IE, version, ieStyleName);
    });

    return result;
};


exports.init = function (knoxConf, gettext, diskSavePath) {
    gt = gettext;
    knoxConfig = knoxConf;
    saveDiskPath = diskSavePath;
    // TODO: we are calling the clearCache method now in worker directly to cache more calls.
    // This might change when API is giving back language specific results
    //restHelper.clearCache();
};
exports.clearApiCache = function () {
    restHelper.clearCache();
};

var predefinedModules = {};
var templates = {};

var getPredefinedModule = function (namespace, module) {
    var modulePath = path.join('../../..', namespace, 'library', module);

    if (predefinedModules[modulePath]) {
         return predefinedModules[modulePath];
    }

    predefinedModules[modulePath]= require(modulePath);
    return predefinedModules[modulePath];
};

var readFile = Q.denodeify(fs.readFile);

var getTemplate = function (templatePath, callback) {
    if (templates[templatePath]) {
        return templates[templatePath].done(function (content) {
            callback(null, content);
        });
    }

    templates[templatePath] = readFile(templatePath, 'utf-8');

    templates[templatePath].fail(function (err) {
            callback(err);
        })
        .done(function (content) {
            callback(null, content);
        });

};

var generateJigs = function (config, viewContainer, callback) {

    async.eachSeries(Object.keys(config.jigs), function (jigClass, next) {
        if (config.jigs[jigClass].disabled || config.jigs[jigClass].prerender === false) {
            return next();
        }
        // get the jig class to be filled with ejs template
        var jig = config.jigs[jigClass];
        var jigRegex
        if (typeof jig === "string") {
            jig = {"controller": jig};
        }
        // this jig needs to be loaded on page call, so we do nothing here
        if (!jig.controller) {
            return next();
        }

        // get optional parameters from config
        if (jig.options !== undefined) {
            for (var option in jig.options) {
                viewContainer[option] = jig.options[option];
            }
        }
        if (jigClass.substr(0, 1) === ".") {
            jigRegex = new RegExp("<((section)\\s[^>]*class=['\"][^'\"]*\\b" + jigClass.substr(1) + "\\b[^'\"]*['\"][^>]*)>.*?<\\/section>", "im");
        } else {
            jigRegex = new RegExp("<(\\b" + jigClass + "\\b[^>]*)>[\\s\\S]*?<\\/(\\b" + jigClass + "\\b)>", "m");
        }
        // add ejs template to html template
        var ejsTemplateFile = jig.template || jig.controller.replace(/\./g, "/").toLowerCase() + "/views/init.ejs";
        if (typeof ejsTemplateFile === "object") {
            ejsTemplateFile = ejsTemplateFile[config.locale];
        }
        if (!ejsTemplateFile) {
            return next();
        }
        getTemplate(ejsTemplateFile, function (err, ejsTemplate) {
            if (err) {
                return next(err);
            }
            ejsTemplate = ejsTemplate.replace(/<%==/g, "<%-").replace(/___v1ew.push\(/g, "buf.push(");

            gt.setLocale(viewContainer.locale);
            viewContainer._ = gt._.bind(gt);
            if (ejsTemplateFile.match("\.mustache$")) {
                ejsTemplate = mustache.to_html(ejsTemplate, viewContainer);
            } else if (ejsTemplateFile.match("\.ejs")) {

                ejsTemplate = ejs.render(ejsTemplate, viewContainer);
            }
            config.template = config.template.replace(jigRegex, '<$1>' + ejsTemplate + '</$2>');

            next();
        });
    }, function (err) {
        if (err) {
            return callback(err);
        }
        callback(null, config);
    });

};
/**
 * @name UploadItem
 * @type {{
 *     path: String,
 *     content: String,
 *     url: String,
 *     time: Number
 * }}
 */

/**
 * @callback GeneratePageCallback
 * @param {Error}
 * @param {UploadItem}
 */

/**
 *
 * @param origConfig
 * @param {GeneratePageCallback} callback
 */
exports.generatePage = function (origConfig, callback) {
    origConfig = childPageUploadUrl(origConfig);

    var config = deepExtend({}, origConfig),
        namespace = config.namespace,
        namespaceCapital = capitaliseFirstLetter(config.namespace),

        filename,
        viewContainer = config.viewContainer,
        url = config.uploadUrl,
        html = "",
        predefinedVarString;



    if (config["child-page-path"]) {
        config["child-page-path"] = _.map(config["child-page-path"], function (page) {
            return {
                url: page.url,
                name: page.name ? gt._(namespace + "-core-page", page.name)
                                : gt._(namespace + "-core-page", page.url)
            };
        });
        config.predefined["child-page-path"] = config["child-page-path"];
    }

    // TODO: Needed for pages?

    config.template = ejs.render(config.template, viewContainer);
    viewContainer[namespaceCapital] = {config: config, predefined: config.predefined};
    viewContainer._ = global._ = gt._;
    viewContainer._n = gt._n;
    //for (var key in config) {
    //    if (key === "predefined") continue;
    //    if (viewContainer[key]) continue;
    //    viewContainer[key] = viewHelper.deployAttr(config[key]);
    //}
    //for (var key in config["predefined"]) {
    //    viewContainer[key] = viewHelper.deployAttr(config["predefined"][key]);
    //}

    viewContainer = _.assign(viewContainer, config.predefined);
    viewHelper.deployAttr();
    config.template = slots.executeJigSlotLogic(config.jigs, config.template);


    generateJigs(config, viewContainer, function (err, config) {
        var script = '<script id="' + namespace + '-application-data" type="text/javascript">' +
            ' window.' + namespaceCapital + ' = window.' + namespaceCapital + ' || {};' +
            ' window.' + namespaceCapital + '.predefined = window.' + namespaceCapital + '.predefined || {};' + "\n";
        var excludedPredefinedVar = getExcludedPredefinedVariables(config.jigs);


        for (var predefinedVar in config.predefined) {
            if (config.predefined.hasOwnProperty(predefinedVar) && config.predefined[predefinedVar] !== undefined) {
                if (predefinedVar === "attr" || _.contains(excludedPredefinedVar, predefinedVar)) continue;
                if (typeof config.predefined[predefinedVar] === 'function') continue;
                predefinedVarString = JSON.stringify(config.predefined[predefinedVar]);
                predefinedVarString = predefinedVarString.replace(/\$&/g, '');
                predefinedVarString = predefinedVarString.replace(/<script.*?>/ig, '');
                predefinedVarString = predefinedVarString.replace(/<style.*?>/ig, '');
                script += namespaceCapital + '.predefined["' + predefinedVar + '"] = ' + predefinedVarString + ";\n";
            }
        }

        script += namespaceCapital + '.predefined["child-page-path"] = ' + JSON.stringify(config["child-page-path"]) + ";\n";
        viewContainer.this = viewContainer;
        delete viewContainer.this.this;
        // load all predefined modules like filtervalues
        var neededData = [];
        for (var predefinedModule in config.predefinedModules) {
            if (config.predefinedModules.hasOwnProperty(predefinedModule)) {
                if (config.predefinedModules[predefinedModule].module) {
                    for (var call in config.predefinedModules[predefinedModule].apicalls) {
                        if (viewContainer[call] && typeof viewContainer[call] === 'object') {
                            neededData[call] = viewContainer[call];
                        }
                    }
                    var PredefinedModule = getPredefinedModule(config.namespace, config.predefinedModules[predefinedModule].module);

                    var predefinedHelper = new PredefinedModule();
                    script += namespaceCapital + ".predefined." + predefinedModule + ' = ' + JSON.stringify(
                        predefinedHelper.init(neededData)
                    ) + ";\n";
                    predefinedHelper = null;
                }
            }
        }

        script += '</script>';
        script += generateProductionScriptTags(namespace, config.browsers, config.scriptName);
        var style = generateProductionStyleTags(config.browsers, config.scriptName);

        var scriptTagRegExp = new RegExp('<script[^>]+id="' + namespace + '-application-script"[^>]*><\\/script>');
        var styleTagRegExp = new RegExp('<link[^>]+id="' + namespace + '-application-style"[^>]*>');

        //var finalHtml = config["template"].replace(/<script[^>]+id="yd-application-script"[^>]*><\/script>/, script);
        var finalHtml = config.template.replace(scriptTagRegExp, script).replace(styleTagRegExp, style);
        url += ".html";
        filename = config["upload-worker"] ?
        saveDiskPath + "/production." + url.replace(/\//g, "_") :
            path.join(config.pagePath, "production." + url.replace(/\//g, "_"));



        callback(null, {
            path: filename,
            content: finalHtml,
            url: url,
            time: config.apiCallTime
        });
    });


};



/**
 *
 * @param config
 * @return {Array.<UploadItem>}
 */
exports.generateJsonPage = function (config) {
    var viewContainer = config["viewContainer"],
        mainUrl = (viewContainer["parentUrl"] || viewContainer["url"]) + config["jsonUrlPostfix"],
        toUpload = [],
        alreadyInArray = [];

    var recursive = function (results, options) {
        _.each(_.isArray(results) ? results : [results], function (result, index) {
            var toUrl, copy = {},
                copyResult = JSON.parse(JSON.stringify(result));
            if (options.remove) {
                _.each(options.remove, function (key) {
                    if (key in result) delete result[key];
                });
            }
            if (options.pick) {
                _.each(options.pick, function (key) {
                    if (key in result) copy[key] = result[key];
                });
                result = copy;
            }
            if (options.to) {
                toUrl = placeholderHelper.simpleReplace(options.to.replace("{url}", mainUrl), copyResult);
                results[index] = "http://" + knoxConfig.S3_BUCKET + "/" + toUrl;
                if (alreadyInArray.indexOf(toUrl) === -1) {
                    toUpload.push([toUrl, result]);
                    alreadyInArray.push(toUrl);
                }
            }
            if (options.extract) {
                _.each(options.extract, function (extract) {
                    var extResult,
                        childUrl;
                    if (extract.key && extract.options) {
                        if (extract.key in result && result[extract.key] !== null) {
                            recursive(result[extract.key], extract.options);
                        }
                    }
                    if (extract.keys && extract.to) {
                        extResult = undefined;
                        childUrl = placeholderHelper.simpleReplace(extract.to.replace("{url}", mainUrl), copyResult);
                        _.each(extract.keys, function (key) {
                            if (key in result) {
                                if (!_.isEmpty(result[key])) {
                                    extResult = extResult || {};
                                    extResult[key] = result[key];
                                    result[key] = "http://" + knoxConfig.S3_BUCKET + "/" + childUrl;
                                    if (extract.remove) {
                                        delete result[key];
                                    }
                                } else if (extract.nullIfEmpty) {
                                    result[key] = null;
                                }
                            }
                        });
                        if (typeof extResult !== "undefined" && alreadyInArray.indexOf(childUrl) === -1) {
                            toUpload.push([childUrl, extResult]);
                            alreadyInArray.push(childUrl);
                        }
                    }
                    if (extract.key && extract.to) {
                        extResult = undefined;
                        childUrl = placeholderHelper.simpleReplace(extract.to.replace("{url}", mainUrl), copyResult);
                        if (extract.key in result) {
                            if (!_.isEmpty(result[extract.key])) {
                                extResult = result[extract.key];
                                result[extract.key] = "http://" + knoxConfig.S3_BUCKET + "/" + childUrl;
                                if (extract.remove) {
                                    delete result[extract.key];
                                }
                            } else if (extract.nullIfEmpty) {
                                result[extract.key] = null;
                            }
                        }
                        if (typeof extResult !== "undefined" && alreadyInArray.indexOf(childUrl) === -1) {
                            toUpload.push([childUrl, extResult]);
                            alreadyInArray.push(childUrl);
                        }
                    }
                });
            }
        });
    }
    _.each(config.jigs, function (jig, jigClass) {
        _.each(jig.apicalls, function (apiCall, apiCallName) {
            if (!apiCall.cache) {
                return;
            }
            _.each(apiCall.cache, function (cache) {
                var apiResult = cache.modify
                        ? config.predefined[apiCallName]
                        : JSON.parse(JSON.stringify(config.predefined[apiCallName])),
                    childUrl;
                if (cache.options) {
                    recursive(apiResult, cache.options);
                }
                if (cache.to) {
                    childUrl = cache.to.replace("{url}", mainUrl).replace("{pageNum}", 1);
                    if (alreadyInArray.indexOf(childUrl) === -1) {
                        toUpload.push([childUrl, apiResult]);
                        alreadyInArray.push(childUrl);
                    }
                }
            });
        });
    });

    return toUpload.map(function (upload) {
        var filename = config["upload-worker"] ?
        saveDiskPath + "/production." + upload[0].replace(/\//g, "_") :
        config.pagePath + "production." + upload[0].replace(/\//g, "_");

        return {
            path: filename,
            content: JSON.stringify(upload[1]),
            url: upload[0],
            time: config.apiCallTime
        };
    });
};




var apiMessageCounter = 0;

var getRandom = function () {
    return String(Math.round(Math.random() * 10000));
};

exports.createApiMessageKey = function (messageKey) {
    messageKey = messageKey || getRandom();
    apiMessageCounter += 1;
    return md5(messageKey + apiMessageCounter + getRandom() + Date.now());
};
exports.deleteCachedCall = function (apiMessageKey) {
    restHelper.deleteCachedCall(apiMessageKey);
};

var addJigsToApiCall = function (callbackContainer, config, emitter, apiconfig, callback) {
    var callList = [];
    for (var jigClass in config.jigs) {

        // get the jig class to be filled with ejs template
        var jig = config.jigs[jigClass];
        if (typeof jig === "string") {
            jig = {"controller": jig};
        }
        // this jig needs to be loaded on page call, so we do nothing here
        if ((jig.prerender === false && !jig.slot) || jig.disabled) {
            delete config.jigs[jigClass];
            continue;
        }
        // adding all predefined variables to gather from api
        for (var apicall in jig.apicalls) {
            emitter.emit('call:parsing', apicall, jig.apicalls[apicall]);
            if (jig.apicalls.hasOwnProperty(apicall)) {
                if (jig.apicalls[apicall].predefined) {
                    callList.push({
                        apicall: apicall,
                        jig: jig
                    });

                }
            }
        }
    }

    async.each(callList, function (call, next) {
        restHelper.addCallAsync(call.apicall, call.jig, config.predefined, apiconfig, function (err, res) {
            if (err) {
                return next(err);
            }
            callbackContainer.push(res);
            next(null);
        });
    }, callback);
};

var addPredefinedModulesToApiCall = function (callbackContainer, config, apiconfig, callback) {

    var callList = [];
    for (var predefinedModule in config.predefinedModules) {
        for (var call in predefinedModule.apicalls) {
            if (predefinedModule.apicalls.hasOwnProperty(call)) {
                if (predefinedModule.apicalls[call].predefined) {
                    callList.push(call);
                    //callbackContainer.push(restHelper.addCall(call, config.predefinedModule, config.predefined, apiconfig));
                }
            }
        }
    }

    async.each(callList, function (call, next) {
        restHelper.addCallAsync(call, config.predefinedModule, config.predefined, apiconfig, function (err, res) {
            if (err) {
                return next(err);
            }

            callbackContainer.push(res);
            next(null);
        });
    }, callback);
};


var apiCalls = function (configs, emitter, callback, readyConfigs, dontCheckPlaceholders) {
    var config = configs.shift(),
        nextConfigs,
        configPlaceholders,
        callbackContainer = [],
        childUrl = "",
        apiconfig = {
            "version": config.version,
            "hostname": config.apiConfig.hostname,
            "port": config.apiConfig.port,
            "base": config.apiConfig.base,
            "db":  config.domain,
            "apiMessageKey": config.apiMessageKey
        };

    if (typeof emitter === 'function') {
        callback = emitter;
        emitter = new EventEmitter();
    }

    readyConfigs = readyConfigs || [];
    if (config["predefined"] && !dontCheckPlaceholders) {
        configPlaceholders = placeholderHelper.getConfigPlaceholders(config["jigs"], config["predefined"]);
        if (configPlaceholders) {
            if (configPlaceholders.pageNum) {
                delete configPlaceholders.pageNum;
            }

            nextConfigs = placeholderHelper.replaceConfigPlaceholders(config, configPlaceholders);
            if (nextConfigs.length === 1) {
                config = nextConfigs[0];
            } else if (nextConfigs.length > 1) {
                nextConfigs.forEach(function (nextConfig) {
                    configs.unshift(nextConfig);
                });
                apiCalls(configs, emitter, callback, readyConfigs, true);
                return;
            } else {
                if (configs.length === 0) {
                    callback(null, readyConfigs);
                } else {
                    apiCalls(configs, emitter, callback, readyConfigs);
                }
                return;
            }
        }
    }
    config["viewContainer"]["url"] = config["url"];


    if (config["child-page-path"]) {
        config["predefined"]["child-page-path"] = config["child-page-path"];
        config["viewContainer"]["parentUrl"] = config["viewContainer"]["url"];
    }


    async.series([
        function (next) {
            addJigsToApiCall(callbackContainer, config, emitter, apiconfig, next);
        },
        function (next) {
            addPredefinedModulesToApiCall(callbackContainer, config, apiconfig, next);
        }
    ], function (err) {
        if (err) {
            return callback(err);
        }

        // work through all calls and wait for all to finish
        async.map(callbackContainer, restHelper.doCall, function (err, results) {

            var failedCalls = [],
                nextConfig;
            try {
                for (var key in results) {
                    if (results.hasOwnProperty(key)) {
                        var item = results[key];
                        if (item.success == false) {
                            var reason = ''
                            if (item.resultCode) {
                                reason += ' status code: ' + item.resultCode;
                            }
                            if (item.message) {
                                reason += ' error message: ' + item.message;
                            }


                            failedCalls.push("Error in rest call: " + item.path + " " + JSON.stringify(item.query) + reason);

                        } else {
                            config["predefined"][item.viewParam] = item.result;
                            emitter.emit('call:success', item.requestId, item.time, item.fromCache);
                        }
                    }
                }
                config.apiCallTime = Date.now();


                if (failedCalls.length) {
                    callback({message: "Doing nothing further for " + config["viewContainer"]["url"] + "\n(" + failedCalls.join(";\n") + ")"});
                    return;
                }
                if (!config["predefined"].pageNum || config["predefined"].pageNum === 1) {
                    if (config.hasOwnProperty("child-pages") && config["child-pages"]) {
                        for (var childPage in config["child-pages"]) {
                            // automated child pages
                            if (config["child-pages"][childPage]["child-page-path"]) {
                                nextConfig = deepExtend({}, config, config["child-pages"][childPage]);
                                // For now child-child-pages are not possible
                                delete nextConfig["child-pages"];
                                if (nextConfig.triggerGt) {
                                    var triggerValue = placeholderHelper.getParamByString(nextConfig.triggerGt.field.replace(/[{}]/g, ""), config["predefined"]);
                                    if (triggerValue !== undefined && triggerValue <= nextConfig.triggerGt.value) {
                                        nextConfig = undefined;
                                    } else {
                                        configs.unshift(nextConfig);
                                    }
                                } else {
                                    configs.unshift(nextConfig);
                                }
                            }
                        }
                    }
                    if (config["pagination-dependency"]) {
                        var dataLength = placeholderHelper.getParamByString(config["pagination-dependency"].replace(/[{}]/g, ""), config["predefined"]);
                        if (dataLength) {
                            for (var i = 2; i < dataLength / config["predefined"].pageLimit + 1; i++) {
                                nextConfig = deepExtend({}, config);

                                try {
                                    nextConfig.jigs = placeholderHelper.deepReplace(nextConfig.jigs, "{pageNum}", i);
                                } catch (e) {
                                }
                                nextConfig["pagination-number"] = i;
                                nextConfig["predefined"].pageNum = i;
                                nextConfig["child-page-path"] = nextConfig["child-page-path"] || [];
                                nextConfig["child-page-path"].push({url: i});
                                nextConfig["pagination-dependency"] = false;
                                configs.unshift(nextConfig);
                            }
                        }
                    }
                }
                readyConfigs.push(config);
                emitter.emit('config:ready', readyConfigs.length, configs.length, config["viewContainer"]["url"]);
                if (configs.length === 0) {
                    callback(null, readyConfigs);
                } else {
                    apiCalls(configs, emitter, callback, readyConfigs);
                }
            }
            catch (err) {
                callback({message: "failed to parse configs: " + err, err: err});
            }

        });

    });

};
exports.apiCalls = apiCalls;
