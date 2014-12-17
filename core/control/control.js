steal("can/control", "lib/view-helpers", function () {
    "use strict";

    can.Control.prototype.renderJig = function (configSelector, selector, options) {
        var Controller,
            jigs = steal.config(steal.config("namespace")).jigs;

        if (!options && typeof selector === "object") {
            options = selector;
            selector = undefined;
        }

        if (!selector) {
            selector = configSelector;
            configSelector = configSelector.substring(configSelector.lastIndexOf(" ") + 1 || 0);
        }

        if (!jigs || !jigs[configSelector]) {
            throw new Error("No config for " + configSelector);
        }

        options = can.extend(true, {}, jigs[configSelector].options, options);

        Controller = eval(jigs[configSelector].controller);
        if (Controller) {
            return new Controller(selector, options);
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
        },
        convertDateToWeekday: function (date) {
            var dayNamesMin = [  _("yd-datepicker-so"), _("yd-datepicker-mo"), _("yd-datepicker-di"), _("yd-datepicker-mi"), _("yd-datepicker-do"), _("yd-datepicker-fr"), _("yd-datepicker-sa") ];
            return dayNamesMin[date.getDay()];
        }
    };

    return can;
});
