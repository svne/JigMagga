"use strict";

var JigConfig = require('loader-libs/jig-config.js'),

// in comments parts of the text where this field is needed
    PAGE_CONFIG_FIELDS = ['namespace','domain','locales','pages','crosslinks','companyinfo',
        'pattern','init-locale','env','isBuild',
        'tracking', // can.Control.extend('Yd.Tracking',
        'configdomain',  //Yd.Liveconfig.load = function(func, error)
        'appTracking', // getAppTrackLink: function (system, component) {
        'version', // url: Yd.config.api + Yd.config.version + "/customer/resetpassword",
        'fb','fbDev', //   Yd.config.fb = Yd.config.fbDev;
        'includes',  // steal.apply(steal, config.includes);
        'api', //  can.fixture("GET " + Yd.config.api + Yd
        'services' // _("yd-jig-plz-check-count-of-partners", typeof servicescount !== "undefined" ? servicescount : Yd.config.services.count)

    ], //+jigs

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

    // conf.js mergedConfig.groupedDomain = domain;
    this.groupedDomain = this.domain;

}


PageConfig.prototype.printJigs = function (){
    this.jigConfigs.forEach(function(jig){
        console.log(jig.key);
    });
};

PageConfig.prototype.setLocale = function(){
//	this._locale = readCookie("locale")|| 'default';
    var self = this;
    // set local
    self.locale = self["init-locale"] ||
        self.env === 'development' && self.isBuild && readCookie("locale") ||
        self["init-locale"] ||
        (self.locales && self.locales[0]) || "default";
//	console.log('PageConfig setLocale',this._locale);
};

PageConfig.prototype.includeJigsTemplates = function() {
    var self = this,
        FALLBACK_LOCALE = 'de_DE';
    self.jigConfigs.forEach(function(jig) {
        jig.includeTemplate(self.locale || FALLBACK_LOCALE);
    });
};



PageConfig.prototype.prepareNamespace = function (){
    var self = this,
        namespace = upperSizeFirstLetter(self.namespace);

    if (window && typeof namespace === 'string') {
        window[namespace] =  window[namespace]||{};
        window[namespace].predefined = window[namespace].predefined || {};
        window[namespace].request = window[namespace].request || {};
        window[namespace].config = self;
    }

    this.namespace = namespace;
};

PageConfig.prototype.getAllocateJigsText = function (){
    return this.jigConfigs.map(function(jig){
        if (jig.controller) {
            return '\n new ' + jig.controller +
                '("' + jig.key + '",' + JSON.stringify(jig.options || {}) +');';
        } else {
            return '';
        }

    }).join('\n');
};

PageConfig.prototype.allocateJigs = function (){
    // quick hack
    eval(this.getAllocateJigsText());

};

PageConfig.prototype.getCanRoutesText = function () {
    var routes;
    return this.jigConfigs.map(function(jig){
        if (jig.options && jig.options.routes) {
            routes = jig.options.routes;
            return Object.keys(routes).map(function(route){
                return 'can.route(\''+route+'\','+ JSON.stringify(routes[route])+');';
            }).join('\n');
        } else {
            return '';
        }
    }).join('\n');

};

PageConfig.prototype.getIncludes = function() {
    var result = [];
    if (this.includes && this.includes.length > 0) {
        this.includes.forEach(function(item){
            var uri;
            //TODO undestand how urls of the type '//yd/fixtures/fixtures.js' work
            // for now its pretty dirty, cause I don't know how steal does this stuff
            uri = (typeof item.id === 'string') ? item.id : item;
            uri = uri.replace('//','');
            result.push(uri);
        });
    }
    return result;
};

PageConfig.prototype.getIncludesText = function() {
    return this.getIncludes().map(function(uri){
        return 'require("'+uri+'");';
    }).join('\n');
};

module.exports = PageConfig;