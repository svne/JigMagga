steal.config({
    jmENV : "development",
    map: {
        scss: "steal-types/sass/sass.js",
        ejs: "can/view/ejs/ejs.js",
        mustache: "can/view/mustache/mustache.js",
        conf: "steal-types/conf/conf.js",
        po: "steal-types/po/po.js",
        "*": {
            "jquery/jquery.js": "jquery",
            "jquery/jstorage": "bower_components/jstorage/jstorage.js",
            "can/util/util.js": "can/util/jquery/jquery.js",
            "can/control": "core/control.js"
        }
    },
    paths: {
        "jquery/": "bower_components/jquerypp/",
        "jquery": (this.navigator && this.navigator.userAgent.indexOf("MSIE") !== -1) || (typeof global !== "undefined" && global.DEFAULTS.browser && DEFAULTS.browser.indexOf("msie") !== -1) ? "bower_components/jquery-legacy/jquery.js" :  "bower_components/jquery/jquery.js",
        "can/": "bower_components/canjs/steal/",
        "qunit/": "bower_components/qunit/qunit/"
    },
    shim: {
        jquery: {
            exports: "jQuery"
        },
        "can/util/fixture/fixture.js" : {
            ignore : true
        },
        "steal-types/conf/conf.js" : {
            ignore : true
        },
        "steal-types/sass/sass.js" : {
            ignore : true
        },
        "steal-types/less/less.js" : {
            ignore : true
        },
        "steal-types/po/po.js" : {
            ignore : true
        }
    }
});
