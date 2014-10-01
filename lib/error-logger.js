// TODO: rewrite and put into steal
(function (namespace) {
    var _queue = [],
        _joinArguments = function (args) {
            for (var i = 0, total = '', len = args.length; i < len; i++) {
                if (typeof args[i] === 'object' && typeof JSON !== 'undefined' && JSON.stringify) {
                    try {
                        total += JSON.stringify(args[i]);
                    } catch (e) {
                        total += e;
                    }
                } else if (args[i] && args[i].toString()) {
                    total += args[i].toString();
                }
            }
            return total;
        };
    namespace.Jm = namespace.Jm || {};
    namespace.Jm.getErrorLoggerUrl = function(){
        return steal.config(steal.config("namespace")).errorLoggerUrl;
    };
    namespace.Jm.errorLogFunc = function (errorMessage, url, line) {
        var loggerUrl = this.getErrorLoggerUrl();
        var parameters = "?Message=" + encodeURIComponent(errorMessage)
            + "&Url=" + encodeURIComponent(url)
            + "&Line=" + encodeURIComponent(line)
            + "&Parent_url=" + encodeURIComponent(document.location.href)
            + "&User_agent=" + encodeURIComponent(navigator.userAgent)
            + "&level=error"
            + "&Logqueue=" + encodeURIComponent(_queue.toString().replace(/"/g, '').substring(0, 60));
        new Image().src = loggerUrl + parameters;
    };
    namespace.Jm.errorLog = function (errorMessage) {
        var msg = "";
        if ("console" in namespace && console.warn) {
            console.warn(arguments);
        }
        if (arguments.length > 1 && can && typeof JSON.stringify === "function") {
            msg = JSON.stringify(arguments);
        } else if (arguments.length > 1 && JSON && typeof JSON.stringify === "function") {
            msg = JSON.stringify(arguments);
        } else {
            msg = errorMessage;
        }
        namespace.Jm.errorLogFunc(msg, namespace.location.href, 0);
    };
    namespace.Jm.log = function () {
        if ("console" in namespace && console.log && typeof console.log.apply === "function") {
            console.log.apply(console, arguments);
        }
    };
    namespace.onerror = function (errorMessage, url, line) {
        namespace.Jm.errorLogFunc(errorMessage, url, line);
    };
    namespace.steal = namespace.steal || {};
    namespace.steal.dev = {
        jmENVProduction: function () {
            if (!this.jmENVProductionSave) {
                this.jmENVProductionSave = steal.config().env !== "development";
            }
            return this.jmENVProductionSave;
        },
        warn: function () {
            if (arguments && arguments.length > 0) {
                _queue.push('WARN ' + window.Date() + ' : ' + _joinArguments(arguments));
            }
            if (!this.jmENVProduction()) {
                namespace.Jm.log.apply(null, arguments);
            }
        },
        log: function () {
            if (arguments && arguments.length > 0) {
                _queue.push('LOG ' + window.Date() + ' : ' + _joinArguments(arguments));
            }
            if (!this.jmENVProduction()) {
                namespace.Jm.log.apply(null, arguments);
            }
        },
        getLog: function () {
            if ("console" in namespace && console.log) {
                console.log(_queue);
            }
        },
        warnTracking: function () {
            var loggerUrl = namespace.Jm.getErrorLoggerUrl();
            var parameters = "?Message=" + encodeURIComponent("warnTracking: " + _joinArguments(arguments))
                + "&Parent_url=" + encodeURIComponent(document.location.href)
                + "&User_agent=" + encodeURIComponent(navigator.userAgent)
                + "&level=warnTracking"
                + "&Logqueue=" + encodeURIComponent(_queue.toString().replace(/"/g, ''));
            new Image().src = loggerUrl + parameters;
        }

    };
})(window);
