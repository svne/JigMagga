/**
 * Adopted from https://github.com/webpack/style-loader/blob/master/addStyles.js
 * by Jaroslav on 23.10.2015
 * @type {exports|module.exports}
 */
"use strict";

var loaderUtils = require("loader-utils"),
    path = require("path");
module.exports = function() {};
module.exports.pitch = function(remainingRequest) {
    var query;
    if(this.cacheable) {
        this.cacheable();
    }
    query = loaderUtils.parseQuery(this.query);
    return [
        "// conf-loader: Performs browser part. Setting locales and instantiating jigs.",
        "",
        "// load the configuration",
        "var confContent = require(" + loaderUtils.stringifyRequest(this, "!!" + remainingRequest) + ");",
        "if(typeof content === 'string') content = [[module.id, content, '']];",
        "// add the styles to the DOM",
        "var update = require(" + loaderUtils.stringifyRequest(this, "!" + path.join(__dirname, "inBrowser.js")) + ")(confContent, " + JSON.stringify(query) + ");",
        "//if(content.locals) module.exports = content.locals;",
        "// Hot Module Replacement",
        "if(module.hot) {",
        "//\ When the styles change, update the \<style\> tags",
        "	if(!content.locals) {",
        "		module.hot.accept(" + loaderUtils.stringifyRequest(this, "!!" + remainingRequest) + ", function() {",
        "			var newContent = require(" + loaderUtils.stringifyRequest(this, "!!" + remainingRequest) + ");",
        "			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];",
        "			update(newContent);",
        "		});",
        "	}",
        "	//\ When the module is disposed, remove the <style> tags",
        "	module.hot.dispose(function() { update(); });",
        "}"
    ].join("\n");
};