steal("can/util", "jquery", function () {
    "use strict";
    Yd.Liveconfig = {};
    Yd.Liveconfig.load = function (func, error) {
        Yd.config.live = Yd.config.live || {};
        error = error || function () {};
        if (!Yd.config.live.deferred) {
            var pageName = $("body") && $("body").data && $("body").data("pagename") && $("body").data("pagename").toString() || "notset";
            Yd.config.live.deferred = can.ajax({
                url: "/config/config.json",
                cache: false,
                success: function (data) {
                    Yd.config.live.config = data;
                    Yd.config.live.config.pageName = pageName;
                    Yd.Liveconfig.init(Yd.config.live.config);
                    if (func) {
                        func(Yd.config.live.config);
                    }
                },
                error: function (err) {
                    Yd.config.live.config = {};
                    Yd.config.live.config.pageName = pageName;
                    if (func) {
                        func(Yd.config.live.config);
                    }
                    if (error) {
                        error(err);
                    }
                }
            });
            return Yd.config.live.deferred;
        } else {
            Yd.config.live.deferred.done(function (data) {
                if (func) {
                    func(Yd.config.live.config);
                }
            });
            if (error) {
                Yd.config.live.deferred.fail(function (data) {
                    if (func) {
                        func(Yd.config.live.config);
                    }
                    error(data);
                });
            }
        }
    };
    Yd.Liveconfig.hasFunction = function (func) {
        return Yd.config.live.config && Yd.config.live.config.functions && Yd.config.live.config.functions.indexOf(func) !== -1;
    };
    Yd.Liveconfig.hasVendor = function (vendor) {
        return Yd.config.live.config && Yd.config.live.config.vendors && Yd.config.live.config.vendors.indexOf(vendor) !== -1;
    };
    Yd.Liveconfig.init = function (config) {
        var styleTag,
            styleClass,
            css = "",
            hasStyle = !!config.style;
        // process styles
        config.style = config.style || {};
        // add style for removing googlemaps im not set
        if (!Yd.Liveconfig.hasVendor("maps")) {
            config.style[".yd-geo-map"] = "display:none!important";
            hasStyle = true;
        }

        if (hasStyle) {
            for (styleClass in config.style) {
                css += styleClass + " {" + config.style[styleClass] + "}\n";
            }
            styleTag = document.createElement( 'style' );
            styleTag.type = 'text/css';
            if( styleTag.styleSheet ) {
                styleTag.styleSheet.cssText = css;
            } else {
                styleTag.appendChild(document.createTextNode(css));
            }
            $("head").append(styleTag);
        }

        if (config.script) {
            $("head").append("<script type='text/javascript'>" + config.script + "</script>");
        }
    };
});