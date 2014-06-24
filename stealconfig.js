steal.config({
    jmENV : "development",
    map: {
        "*": {
            "jquery/jquery.js": (this.navigator && this.navigator.userAgent.indexOf("MSIE") !== -1) || (typeof global !== "undefined" && global.DEFAULTS.browser && DEFAULTS.browser.indexOf("msie") !== -1) ? "bower_components/jquery-old/jquery.js" :  "bower_components/jquery/jquery.min.js",
            "jquery/jstorage": "bower_components/jstorage",
            "funcunit" : "bower_components/funcunit/dist/"
        }
    },
    paths: {
        "jquery/": "bower_components/jquerypp/",
        "jquerypp/": "bower_components/jquerypp/",
        "can/": "bower_components/canjs/steal/canjs/",
        "qunit/": "bower_components/qunit/qunit/",
        "locales/": "locales/"
    },
    shim: {
        jquery: {
            exports: "jQuery"
        },
        "qunit": {
            deps: ["jquery", "qunit/qunit.css"]
        },
        "funcunit": {
            deps: ["qunit"]
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
    },
    ext: {
        scss: "steal-types/sass/sass.js",
        less: "steal-types/less/less.js",
        ejs: "can/view/ejs/ejs.js",
        mustache: "can/view/mustache/mustache.js",
        coffee: "steal/coffee/coffee.js",
        conf: "steal-types/conf/conf.js",
        po: "steal-types/po/po.js"
    }
});
