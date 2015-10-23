"use strict";

var JigConfig = require('./jig-config.js'),
    PAGE_CONFIG_FIELDS = ['namespace','domain','locales','pages','crosslinks','companyinfo',
        'init-locale','env','isBuild'], //+jigs

// utils, used in steal-types/conf.js
    upperSizeFirstLetter = function (string) {
        return string.toString()[0].toUpperCase() + string.toString().slice(1);
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
    };

// end of utils from steal-type/conf.js

function PageConfig (confObject) {
    var self = this;
    // saving raw config for later debugging
    self.rawConfig = confObject;

    PAGE_CONFIG_FIELDS.forEach(function(key){
        self[key] = confObject[key];
    });
    // gathering information about jigs
    self.jigConfigs = [];
    if (confObject.jigs) {
        Object.keys(confObject.jigs).forEach(function(jigName){
            var newJig = new JigConfig(jigName, confObject.jigs[jigName]);
            newJig.print();
            self.jigConfigs.push(newJig);
        });
    }
}


PageConfig.prototype.printJigs = function (){
    this.jigConfigs.forEach(function(jig){
        console.log(jig.name);
    });
};

PageConfig.prototype.setLocale = function(){
//	this._locale = readCookie("reace")|| 'default';
    var self = this;
    // set local
    self.locale = self["init-locale"] ||
        self.env === 'development' && self["isBuild"] && readCookie("reace") ||
        self["init-locale"] ||
        (self.locales && self.locales[0]) || "default";
//	console.log('PageConfig setLocale',this._locale);
};


PageConfig.prototype.prepareNamespace = function (){
    var self = this,
        namespace = upperSizeFirstLetter(self.namespace);
    if (window && typeof namespace === 'string') {
        window[namespace] =  window[namespace]||{};
//        this[namespace] = window[namespace];
        window[namespace].predefined = window[namespace].predefined || {};
        window[namespace].request = window[namespace].request || {};
        window[namespace].config = self;
    }

};




module.exports = PageConfig;