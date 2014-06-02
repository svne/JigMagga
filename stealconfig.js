steal.config({
    jmENV : "development",
    map: {
        "*": {
            "jquery/jquery.js": (this.navigator && this.navigator.userAgent.indexOf("MSIE") !== -1) || (typeof global !== "undefined" && global.DEFAULTS.browser && DEFAULTS.browser.indexOf("msie") !== -1) ? "jquery/jquery.1.10.2.js" :  "jquery/jquery.2.0.3.js",
            "can/util/util.js": "can/util/jquery/jquery.js",
            "jquery/": "jquerypp/",
            "unit": "unit"
        }
    },
    paths: {
        "jquery/": "jquerypp/",
        "jquery": (this.navigator && this.navigator.userAgent.indexOf("MSIE") !== -1) || (typeof global !== "undefined" && global.DEFAULTS.browser && DEFAULTS.browser.indexOf("msie") !== -1) ? "jquery/jquery.1.10.2.js" :  "jquery/jquery.2.0.3.js"
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
        "steal-types/po/po.js" : {
            ignore : true
        }
    },
    ext: {
        js: "js",
        css: "css",
        scss: "steal-types/sass/sass.js",
        ejs: "can/view/ejs/ejs.js",
        mustache: "can/view/mustache/mustache.js",
        conf: "steal-types/conf/conf.js",
        po: "steal-types/po/po.js"
    }
});
