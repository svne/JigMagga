steal("can/control", function () {

    can.Control.prototype.renderJig = function (configSelector, selector, options) {
        var Controller;

        if (!options && typeof selector === "object") {
            options = selector;
            selector = undefined;
        }

        if (!selector) {
            selector = configSelector;
            configSelector = configSelector.substring(configSelector.lastIndexOf(" ") + 1 || 0);
        }

        if (!steal.config("jigs") || !steal.config("jigs")[configSelector]) {
            throw new Error("No config for " + configSelector);
            return;
        }

        options = can.extend(true, {}, steal.config("jigs")[configSelector].options, options);

        Controller = eval(steal.config("jigs")[configSelector].controller);
        if (Controller) {
            new Controller(selector, options);
        }
    };

    can.Control.prototype.browserNotification = function (title, body, icon, onclick) {
        if ("Notification" in window) {
            var self = this,
                timeout = 30000,
            // TODO: don't define the icon here!
            //icon = "/yd/media/img/yd-notification-logo-" + (Yd.config.satellite ? "satellites" : Yd.config.domain.replace(".","_")) + ".png",
                createNotification = function (obj) {
                    var notification = new Notification(obj.title, {
                        icon: icon,
                        body: obj.body
                    });
                    if (obj.onclick) {
                        notification.onclick = function () {
                            if (obj.onclick.indexOf('#!') !== -1) {
                                if (window.location.hash === obj.onclick) {
                                    window.location.hash = '#!';
                                }
                                setTimeout(function () {
                                    window.location.hash = obj.onclick;
                                }, 100);
                            } else {
                                window.location = obj.onclick;
                            }
                        };
                    }
                    setTimeout(function () {
                        notification.close();
                    }, timeout);
                    window.onunload = function () {
                        notification.close();
                    };
                    window.onbeforeunload = function () {
                        notification.close();
                    };
                };

            // Permission Check
            if (Notification.permission === "default") {
                self.defaults.browserNotificationLatest = {
                    title: title,
                    body: body,
                    onclick: onclick
                };
                clearInterval(self.defaults.browserNotificationTimer);
                self.defaults.browserNotificationTimer = setInterval(function () {
                    if (Notification.permission === "granted" && self.defaults.browserNotificationLatest) {
                        createNotification(self.defaults.browserNotificationLatest);
                        self.defaults.browserNotificationLatest = null;
                    }
                }, 10000);
            } else if (Notification.permission === "granted") {
                createNotification({
                    title: title,
                    body: body,
                    onclick: onclick
                });
            }
        }
    };

    can.Control.prototype.browserNotificationPermission = function () {
            if ("Notification" in window) {
                Notification.requestPermission(function (permission) {
                    if (!('permission' in Notification)) {
                        Notification.permission = permission;
                    }
                });
            }
        };

    can.Control.prototype.helper = {
        isKeyNumeric: function (which) {
            which = which.which || which;
            return (which > 47 && which < 58
                ) || (which > 95 && which < 106
                );
        },
        isKeySystem: function (which) {
            which = which.which || which;
            var allowed = [
                8, // Backspace
                9, // Tab
                13, // Enter
                16, // Shift
                17, // Ctrl
                18, // Alt
                20, // Caps Lock
                37, // Arrow Left
                38, // Arrow Up
                39, // Arrow Right
                40, // Arrow Down
                46, // Delete
                229, // Android
                0
            ];
            return allowed.indexOf(which) >= 0;
        },
        convertDateToGermanDate: function (date) {
            var month = date.getMonth() + 1,
                day = date.getDate();
            return (day < 10 ? "0" + day : day
                ) + "." + (month < 10 ? "0" + month : month
                ) + "." + date.getFullYear().toString();
        },
        convertDateStringToGermanDate: function (date, format) {
            switch (format) {
                case "dd/mm/yy":
                    return date.replace(/\//g, ".");
                default:
                    return date;
            }
        },
        convertDateStringToDate: function (dateString, format) {
            var dateMatch,
                date = new Date();
            switch (format) {
                case "dd.mm.yyyy.hh.mm":
                    dateMatch = dateString.match(/(\d\d)[.\/](\d\d)[.\/](\d\d\d\d)[.\/](\d\d)[.\/](\d\d)/);
                    if (dateMatch) {
                        date = new Date(parseInt(dateMatch[3], 10), parseInt(dateMatch[2], 10) - 1, parseInt(dateMatch[1], 10), parseInt(dateMatch[4], 10), parseInt(dateMatch[5], 10));
                    }
                    break;
                default:
                    dateMatch = dateString.match(/(\d\d)[.\/](\d\d)[.\/](\d\d\d\d)/);
                    if (dateMatch) {
                        date = new Date(parseInt(dateMatch[3], 10), parseInt(dateMatch[2], 10) - 1, parseInt(dateMatch[1], 10));
                    }
                    break;
            }
            return date;
        }
    };
    
    return can;
});
