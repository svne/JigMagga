"use strict";

var PageConfig = require('../loader-libs/page-config.js');

function somethingInBrowser(){
    var el = document.createElement("h3");
    el.innerHTML = 'This is sparta!';
    document.body.appendChild(el);

}

var contentLoaded =function (win, fn) {
    var done = false, top = true,
        doc = win.document, root = doc.documentElement,
        add = doc.addEventListener ? 'addEventListener' : 'attachEvent',
        rem = doc.addEventListener ? 'removeEventListener' : 'detachEvent',
        pre = doc.addEventListener ? '' : 'on',
        init = function (e) {
            if (e.type === 'readystatechange' && doc.readyState !== 'complete') return;
            (e.type === 'load' ? win : doc
            )[rem](pre + e.type, init, false);
            if (!done && (done = true
                )) {
                fn.call(win, e.type || e);
            }
        },
        poll = function () {
            try {
                root.doScroll('left');
            } catch (e) {
                setTimeout(poll, 50);
                return;
            }
            init('poll');
        };
    if (doc.readyState === 'complete') {
        fn.call(win, 'lazy');
    }
    else {
        if (doc.createEventObject && root.doScroll) {
            try {
                top = !win.frameElement;
            } catch (e) {
            }
            if (top) {
                poll();
            }
        }
        doc[add](pre + 'DOMContentLoaded', init, false);
        doc[add](pre + 'readystatechange', init, false);
        win[add](pre + 'load', init, false);
    }
};

module.exports = function(input, options) {
    var pageConfig;
    if(typeof DEBUG !== "undefined" && DEBUG) {
        if(typeof document !== "object") throw new Error("The parse-loader cannot be used in a non-browser environment");
    }

    options = options || {};
    // Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
    // tags it will allow on a page
//    if (typeof options.singleton === "undefined") options.singleton = true;


    // Some stubing stuff, that should be deleted
    // Made temporary to make the prototype page work
    window['_'] = function(str) {return str;};
    steal.dev = {
        log: console.log,
        err: console.error
    }
    window.win = window;
    // delete up to here

    contentLoaded(window, function(){
        var routeInit = false;

        somethingInBrowser(); //this is sparta
        pageConfig = new PageConfig(input.config);
        pageConfig.prepareNamespace();

//        steal.config("namespace", pageConfig.namespace);
        steal.config("namespace", "Yd");
//        steal.config(pageConfig.namespace, pageConfig);
        steal.config("Yd", pageConfig);

        pageConfig.setLocale();
        pageConfig.includeJigsTemplates();
        document.body.className = document.body.className.replace(/\byd-onload\b/, '');
        input.requirePageDeps();


        can.support.cors = true;
        if (routeInit) {
            return false;
        }
        routeInit = true;
        can.route.ydReady = can.Deferred();

        input.addCanRoutes();
        pageConfig.allocateJigs();

        can.route.ready();
        can.route.ydReady.resolve();

    });




    return function update(conf) {
        if(conf) {
            console.log('[INBROWSER] Update function runs');
        }
    };
};