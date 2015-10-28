"use strict";

var JIG_CONFIG_FIELDS = ['controller','template','options','path','includes','render','prerender','slot',
    'disabled',
    'browser' // Yd.Jig.Noscript
];

function controllerToPath(ctrl){
    // Yd.Jig.Socialmedia -> yd/jig/socialmedia/socialmedia.js
    var path = ctrl.toLowerCase().split('.');
    path.push(path.slice(-1)[0]);
    return path.join('/')+'.js';
}

function JigConfig(key, options) {
    var self = this,
        jig = self;
    self.key = key;
    Object.keys(options).forEach(function(key){
        if (JIG_CONFIG_FIELDS.indexOf(key)!==-1) {
            self[key] = options[key];
        } else {
            console.warn('[new JigConfig()] Unknown option "%s". Ignoring',key);
        }
    });
    if (!jig.disabled) {
        if (!jig.path && jig.controller) {
            jig.path = controllerToPath(jig.controller);
        }
//	self.children = [];
    }
    jig.options = jig.options || {};
}

JigConfig.prototype.print = function(){
    var self = this;
    console.log('\nPrinting fields for the entry "%s"',this.key);
    JIG_CONFIG_FIELDS.forEach(function(key){
        if (self[key]) {
            console.log(key+': %s', self[key]);
        }});
};

JigConfig.prototype.process = function(addDependencyCb){
    var includes = this.includes;
    if (this.path) {
        addDependencyCb(this.path);
    }

    if (this.template) {
        addDependencyCb(this.template);
    }

    if (includes) {
        switch (typeof includes) {
            case 'string':
                addDependencyCb(includes);
                break;
            case 'object':
                if (includes.length > 0) {
                    includes.forEach(function(include){
                        addDependencyCb(include);
                    });
                }
        }
    }
};

JigConfig.prototype.includeTemplate = function (locale) {
    var jig = this;

    if (jig.template) {
        if (typeof jig.template === "object") {
            if (jig.template[locale]) {
                jig.options.template = "//" + jig.template[locale];
//                config.includes.push({id: jig.options.template, jig: jig, locale: config.locale});
            } else {
                // fallback if no template for this locale
                jig.options.template = "//" + jig.template[Object.keys(jig.template)[0]];
//                config.includes.push({id: jig.options.template, jig: jig, locale: Object.keys(jig.template)[0]});
            }
        } else {
            jig.options.template = "//" + jig.template;
//            config.includes.push(jig.options.template);
        }
    } else {
        console.warn("Missing template for Controller: ", jig.controller);
    }
};

module.exports = JigConfig;