"use strict";

var PageConfig = require('../loader-libs/page-config.js');

function somethingInBrowser(){
    var el = document.createElement("h3");
    el.innerHTML = 'This is sparta!';
    document.body.appendChild(el);

}


module.exports = function(input, options) {
    var pageConfig;
    if(typeof DEBUG !== "undefined" && DEBUG) {
        if(typeof document !== "object") throw new Error("The parse-loader cannot be used in a non-browser environment");
    }

    options = options || {};
    // Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
    // tags it will allow on a page
//    if (typeof options.singleton === "undefined") options.singleton = true;

    window['_'] = function(str) {return str;};

    somethingInBrowser();
    pageConfig = new PageConfig(input.config);

    pageConfig.prepareNamespace();
    pageConfig.setLocale();
    input.requirePageDeps();

    return function update(conf) {
        if(conf) {
            console.log('[INBROWSER] Update function runs');
        }
    };
};