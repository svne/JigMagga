"use strict";

var JIG_CONFIG_FIELDS = ['controller','template','options','path','includes','render','prerender','slot',
    'disabled',
    'includeController', // [renderJig]  if (jig.includeController ||
    'browser' // Yd.Jig.Noscript
];

function controllerToPath(ctrl){
    // Yd.Jig.Socialmedia -> yd/jig/socialmedia/socialmedia.js
    var path = ctrl.toLowerCase().split('.');
    path.push(path.slice(-1)[0]);
    return path.join('/')+'.js';
}

function pathToCss(ctrl) {
    // Yd.Jig.Indextext -> yd/jig/indextext/css/socialmedia.sass
    var path = ctrl.toLowerCase().split('.');
    path.push('css',path.slice(-1)[0]);
    return path.join('/')+'.scss';


//    return  path + "/css/" + path.split("/").pop(-1) + ".scss";
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

JigConfig.prototype.getResourceList = function(isBuild){
    var result = [],
        includes = this.includes,
        jig = this,
        path;

    // Functionality from conf.js renderJig
    if (jig.render === false && jig.key !== "head") {
        path = controllerToPath(jig.controller);
        if (jig.css !== false) {
            jig.css = pathToCss(jig.controller)
        }
        if (jig.includeController || isBuild) {
            result.push(path);
        }
    } else {
        jig.render = true;
    }


    if (!jig.disabled) {

        if (!jig.path && jig.controller) {
            jig.path = controllerToPath(jig.controller);
        }

        if (jig.path) {
            result.push(jig.path);
        }

        if (jig.css) {
            result.push(jig.css);
        }

        if (jig.template) {
            result.push(jig.template);
        }
        if (includes) {
            switch (typeof includes) {
                case 'string':
                    result.push(includes);
                    break;
                case 'object':
                    if (includes.length > 0) {
                        includes.forEach(function(include){
                            result.push(include);
                        });
                    }
            }
        }
    }
    console.log('Includes for "%s" jig:\n',this.key,result);
    return result;
};

JigConfig.prototype.getConfig = function() {
    var self = this;
    return JIG_CONFIG_FIELDS.map(function(key){
        return self[key];
    });

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