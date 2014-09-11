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
var path = require('path');
var ejs = require("ejs");
var mustache = require('mustache');
var deepExtend = require("deep-extend");
var viewHelper = require("./view.js");
var restHelper = require("./rest.js");
var placeholderHelper = require("./placeholders.js");
var slots = require('./slots');
var http = require('http-get');
var _ = require('lodash');
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
exports.generatePage = function (origConfig, callback) {
    origConfig = childPageUploadUrl(origConfig);

    var config = deepExtend({}, origConfig),
        namespace = config.namespace,
        namespaceCapital = capitaliseFirstLetter(config.namespace),

        filename,
        viewContainer = config["viewContainer"],
        url = config["uploadUrl"],
        html = "",
        predefinedVarString;


    try {


        if (config["child-page-path"]) {
            config["child-page-path"] = _.map(config["child-page-path"], function (page) {
                return {
                    url: page.url,
                    name:  gt._(namespace + "-core-page", page.url)
                };
            });
            config.predefined["child-page-path"] = config["child-page-path"];
        }
        if (viewContainer["shtml"]) {
            viewContainer.filename = fs.realpathSync(config["pagePath"].replace(/\/$/, "") + ".shtml");
            config["pagePath"] = config["pagePath"].replace(/\/[^\/]*$/, "");
        }
        // TODO: Needed for pages?

        config["template"] = ejs.render(config["template"], viewContainer);
        viewContainer[namespaceCapital] = {config: config, predefined: config["predefined"]};
        viewContainer._ = global._ = gt._;
        viewContainer._n = gt._n;
        for (var key in config) {
            if (key === "predefined") continue;
            if (viewContainer[key]) continue;
            viewContainer[key] = viewHelper.deployAttr(config[key]);
        }
        for (var key in config["predefined"]) {
            viewContainer[key] = viewHelper.deployAttr(config["predefined"][key]);
        }

        config["template"] = slots.executeJigSlotLogic(config.jigs, config["template"]);

        for (var jigClass in config.jigs) {
            if (config.jigs.hasOwnProperty(jigClass) && config.jigs[jigClass] && !config.jigs[jigClass].disabled && config.jigs[jigClass].prerender !== false) {
                // get the jig class to be filled with ejs template
                var jig = config.jigs[jigClass];
                var jigRegex
                if (typeof jig === "string") {
                    jig = {"controller": jig};
                }
                if (!jig.controller) {
                    continue;
                }
                // this jig needs to be loaded on page call, so we do nothing here
                if (jig.prerender === false)  continue;

                // get optional parameters from config
                if (jig.options != undefined) {
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
                    continue;
                }
                var ejsTemplate = fs.readFileSync(ejsTemplateFile, "utf-8");
                ejsTemplate = ejsTemplate.replace(/<%==/g, "<%-").replace(/___v1ew.push\(/g, "buf.push(");
                if (ejsTemplateFile.match("\.mustache$")) {
                    ejsTemplate = mustache.to_html(ejsTemplate, viewContainer);
                } else if (ejsTemplateFile.match("\.ejs")) {
                    ejsTemplate = ejs.render(ejsTemplate, viewContainer);
                }
                config["template"] = config["template"].replace(jigRegex, '<$1>' + ejsTemplate + '</$2>');
            }
        }

        var script = '<script id="' + namespace + '-application-data" type="text/javascript">' +
            ' window.' + namespaceCapital + ' = window.' + namespaceCapital + ' || {};' +
            ' window.' + namespaceCapital + '.predefined = window.' + namespaceCapital + '.predefined || {};' + "\n";
        var excludedPredefinedVar = getExcludedPredefinedVariables(config.jigs);

        for (var predefinedVar in config["predefined"]) {
            if (config["predefined"].hasOwnProperty(predefinedVar)) {
                if (predefinedVar == "attr" || _.contains(excludedPredefinedVar, predefinedVar)) continue;
                if (typeof config["predefined"][predefinedVar] == 'function') continue;
                predefinedVarString = JSON.stringify(config["predefined"][predefinedVar]);
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
                    var modulePath = path.join('../../..', config.namespace, 'library', config.predefinedModules[predefinedModule].module);
                    var predefinedHelper = new (require(modulePath))();
                    script += namespaceCapital + ".predefined." + predefinedModule + ' = ' + JSON.stringify(
                        predefinedHelper.init(neededData)
                    ) + ";\n";
                    predefinedHelper = null;
                }
            }
        }


        script += '</script>';
        script += util.format('<!--[if !IE]> --><script id="%s-application-script" type="text/javascript" src="/%s"></script><!-- <![endif]-->', namespace, config["scriptName"]);
        script += util.format('<!--[if IE 7]><script id="%s-application-script-ie7" type="text/javascript" src="/%s"></script><![endif]-->', namespace, config["scriptName"].replace('/production-', '/production-msie7.0-'));
        script += util.format('<!--[if IE 8]><script id="%s-application-script-ie8" type="text/javascript" src="/%s"></script><![endif]-->', namespace, config["scriptName"].replace('/production-', '/production-msie8.0-'));
        script += util.format('<!--[if IE 9]><script id="%s-application-script-ie9" type="text/javascript" src="/%s"></script><![endif]-->', namespace, config["scriptName"].replace('/production-', '/production-msie9.0-'));

        var scriptTagRegExp = new RegExp('<script[^>]+id="' + namespace + '-application-script"[^>]*><\\/script>');
        //var finalHtml = config["template"].replace(/<script[^>]+id="yd-application-script"[^>]*><\/script>/, script);
        var finalHtml = config["template"].replace(scriptTagRegExp, script);
        url += ".html";
        filename = config["upload-worker"] ?
            saveDiskPath + "/production." + url.replace(/\//g, "_") :
            path.join(config["pagePath"], "production." + url.replace(/\//g, "_"));


        return {
            path: filename,
            content: finalHtml,
            url: url,
            time: config.apiCallTime
        };
    }
    catch (err) {
        console.log(err);
        console.log(err.stack);
//        callback && callback({message: "Failed to generate page: " + err});
        return {message: "Failed to generate page: " + err};
    }
};
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

var uploadFileS3 = function (conf, cb) {
    var uploader = new Uploader(knoxConfig);
    uploader.push({
        from: conf.from,
        to: conf.to,
        deleteAfter: true,
        errorCb: function () {
            if (cb) {
                cb({message: "Failed to upload: " + conf.from});
            }
        },
        successCb: function () {
            if (cb) {
                cb(null, conf.from);
            }
        }
    });
    pageCounter++;
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
        // console.log("Getting Placeholders");
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
                if (jig.apicalls[apicall].predefined == true) {
                    callbackContainer.push(restHelper.addCall(apicall, jig, config.predefined, apiconfig));
                }
            }
        }
    }


    // add all predefined modules
    for (var predefinedModule in config.predefinedModules) {
        for (var call in predefinedModule.apicalls) {
            if (predefinedModule.apicalls.hasOwnProperty(call)) {
                if (predefinedModule.apicalls[call].predefined) {
                    callbackContainer.push(restHelper.addCall(call, config.predefinedModule, config.predefined, apiconfig));
                }
            }
        }
    }
    // work through all calls and wait for all to finish
    // console.log("Make all API calls for jigs");
    async.map(callbackContainer, restHelper.doCall, function (err, results) {

        var failedCalls = [],
            nextConfig;
        try {
            for (var key in results) {
                if (results.hasOwnProperty(key)) {
                    if (results[key].success == false) {
                        failedCalls.push("Error in rest call: " + results[key].path + " " + JSON.stringify(results[key].query));
                    } else {
                        config["predefined"][results[key].viewParam] = results[key].result;

                        emitter.emit('call:success', results[key].requestId);
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
                                triggerValue = placeholderHelper.getParamByString(nextConfig.triggerGt.field.replace(/[{}]/g, ""), config["predefined"]);
                                if (triggerValue !== undefined && triggerValue <= nextConfig.triggerGt.value) {
                                    delete nextConfig;
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
                            nextConfig.jigs = placeholderHelper.deepReplace(nextConfig.jigs, "{pageNum}", i);
                            nextConfig["pagination-number"] = i;
                            nextConfig["predefined"].pageNum = i;
                            nextConfig["child-page-path"] = nextConfig["child-page-path"] || [];
//                            nextConfig["child-page-path"].push({name: gt._("yd-core-page", i), url: i});
                            nextConfig["child-page-path"].push({url: i});
                            nextConfig["pagination-dependency"] = false;
                            configs.unshift(nextConfig);
                        }
                    }
                }
            }
            readyConfigs.push(config);
            emitter.emit('config:ready', readyConfigs.length, configs.length, config["viewContainer"]["url"]);
//            console.log("Config", readyConfigs.length, "von", + 1, config["viewContainer"]["url"]);
            if (configs.length === 0) {
                callback(null, readyConfigs);
            } else {
                apiCalls(configs, emitter, callback, readyConfigs);
            }
        }
        catch (err) {
            console.log(err, err.stack);
            callback({message: "failed to parse configs: " + err, err: err});
        }

    });
};
exports.apiCalls = apiCalls;
exports.uploadFileS3 = uploadFileS3;
