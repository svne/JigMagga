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
    namespace.Yd = namespace.Yd || {};
    namespace.Yd.errorLogFunc = function (errorMessage, url, line) {
        var loggerUrl = "http://log.yourdelivery.de:8080";
        var parameters = "?Message=" + encodeURIComponent(errorMessage)
            + "&Url=" + encodeURIComponent(url)
            + "&Line=" + encodeURIComponent(line)
            + "&Parent_url=" + encodeURIComponent(document.location.href)
            + "&User_agent=" + encodeURIComponent(navigator.userAgent)
            + "&level=error"
            + "&Logqueue=" + encodeURIComponent(_queue.toString().replace(/"/g, '').substring(0, 60));
        new Image().src = loggerUrl + parameters;
    };
    namespace.Yd.errorLog = function (errorMessage) {
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
        namespace.Yd.errorLogFunc(msg, namespace.location.href, 0);
    };
    namespace.Yd.log = function () {
        if ("console" in namespace && console.log && typeof console.log.apply === "function") {
            console.log.apply(console, arguments);
        }
    };
    namespace.onerror = function (errorMessage, url, line) {
        namespace.Yd.errorLogFunc(errorMessage, url, line);
    };
    namespace.steal = namespace.steal || {};
    namespace.steal.dev = {
        ydENVProduction: function () {
            if (!this.ydENVProductionSave) {
                this.ydENVProductionSave = steal.config().env !== "development";
            }
            return this.ydENVProductionSave;
        },
        warn: function () {
            if (arguments && arguments.length > 0) {
                _queue.push('WARN ' + window.Date() + ' : ' + _joinArguments(arguments));
            }
            if (!this.ydENVProduction()) {
                namespace.Yd.log.apply(null, arguments);
            }
        },
        log: function () {
            if (arguments && arguments.length > 0) {
                _queue.push('LOG ' + window.Date() + ' : ' + _joinArguments(arguments));
            }
            if (!this.ydENVProduction()) {
                namespace.Yd.log.apply(null, arguments);
            }
        },
        getLog: function () {
            if ("console" in namespace && console.log) {
                console.log(_queue);
            }
        },
        warnTracking: function () {
            var loggerUrl = "http://log.yourdelivery.de:8080";
            var parameters = "?Message=" + encodeURIComponent("warnTracking: " + _joinArguments(arguments))
                + "&Parent_url=" + encodeURIComponent(document.location.href)
                + "&User_agent=" + encodeURIComponent(navigator.userAgent)
                + "&level=warnTracking"
                + "&Logqueue=" + encodeURIComponent(_queue.toString().replace(/"/g, ''));
            new Image().src = loggerUrl + parameters;
        }

    };
    namespace.Yd.perfLog = (function () {
        var logger = {
                log: function (message, options) {
                    var _options = options,
                        appendDate = _options && _options.addDate;
                    if (!namespace.Yd.perfLog.messages) {
                        namespace.Yd.perfLog.messages = [];
                    }
                    namespace.Yd.perfLog.messages.push((appendDate ? ( new Date() + ':') : '') + message);
                },
                getLog: function () {
                    return Yd.perfLog.messages ? Yd.perfLog.messages : [];
                },
                getLogString: function () {
                    return Yd.perfLog.getLog().join(';');
                },
                reset: function () {
                    if (namespace.Yd.perfLog.messages) {
                        namespace.Yd.perfLog.messages = [];
                    }
                },
                time: function (name, reset) {
                    if (!name) {
                        return;
                    }
                    var time = new Date().getTime();
                    if (!namespace.Yd.perfLog.timeCounters) {
                        namespace.Yd.perfLog.timeCounters = {};
                    }
                    var key = "KEY" + name.toString();
                    if (!reset && namespace.Yd.perfLog.timeCounters[key]) {
                        return;
                    }
                    namespace.Yd.perfLog.timeCounters[key] = time;
                },

                timeEnd: function (name) {
                    var time = new Date().getTime();
                    if (!namespace.Yd.perfLog.timeCounters) {
                        return;
                    }
                    var key = "KEY" + name.toString();
                    var timeCounter = namespace.Yd.perfLog.timeCounters[key];
                    var diff;
                    if (timeCounter) {
                        diff = time - timeCounter;
                        var label = name + ": " + diff + "ms";
                        namespace.Yd.perfLog.log(label);
                        delete namespace.Yd.perfLog.timeCounters[key];
                    }
                    return diff;
                }
            },
            productionLogger = {
                log: function (message, options) {
                },
                getLog: function () {
                    return [];
                },
                getLogString: function () {
                    return '';
                },
                reset: function () {
                },
                time: function (name, reset) {
                },
                timeEnd: function (name) {
                }
            };
        return  (steal.config().env !== "production") ? logger : productionLogger;
    })();
})(window);