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
    namespace.Jm.errorLogFunc = function (errorMessage, url, line) {
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
            var loggerUrl = "http://log.yourdelivery.de:8080";
            var parameters = "?Message=" + encodeURIComponent("warnTracking: " + _joinArguments(arguments))
                + "&Parent_url=" + encodeURIComponent(document.location.href)
                + "&User_agent=" + encodeURIComponent(navigator.userAgent)
                + "&level=warnTracking"
                + "&Logqueue=" + encodeURIComponent(_queue.toString().replace(/"/g, ''));
            new Image().src = loggerUrl + parameters;
        }

    };
    namespace.Jm.perfLog = (function () {
        var logger = {
                log: function (message, options) {
                    var _options = options,
                        appendDate = _options && _options.addDate;
                    if (!namespace.Jm.perfLog.messages) {
                        namespace.Jm.perfLog.messages = [];
                    }
                    namespace.Jm.perfLog.messages.push((appendDate ? ( new Date() + ':') : '') + message);
                },
                getLog: function () {
                    return Jm.perfLog.messages ? Jm.perfLog.messages : [];
                },
                getLogString: function () {
                    return Jm.perfLog.getLog().join(';');
                },
                reset: function () {
                    if (namespace.Jm.perfLog.messages) {
                        namespace.Jm.perfLog.messages = [];
                    }
                },
                time: function (name, reset) {
                    if (!name) {
                        return;
                    }
                    var time = new Date().getTime();
                    if (!namespace.Jm.perfLog.timeCounters) {
                        namespace.Jm.perfLog.timeCounters = {};
                    }
                    var key = "KEY" + name.toString();
                    if (!reset && namespace.Jm.perfLog.timeCounters[key]) {
                        return;
                    }
                    namespace.Jm.perfLog.timeCounters[key] = time;
                },

                timeEnd: function (name) {
                    var time = new Date().getTime();
                    if (!namespace.Jm.perfLog.timeCounters) {
                        return;
                    }
                    var key = "KEY" + name.toString();
                    var timeCounter = namespace.Jm.perfLog.timeCounters[key];
                    var diff;
                    if (timeCounter) {
                        diff = time - timeCounter;
                        var label = name + ": " + diff + "ms";
                        namespace.Jm.perfLog.log(label);
                        delete namespace.Jm.perfLog.timeCounters[key];
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
