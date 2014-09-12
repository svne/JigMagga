steal(
    "lib/view-helpers/view-helper-object.js",
    "can/util",
    'can/view/ejs',
    'can/view/mustache',
    function (viewHelpers) {
        "use strict";
        var helper;
        
        for (helper in viewHelpers) {
            if (viewHelpers.hasOwnProperty(helper)) {
                can.EJS.Helpers.prototype[helper] = viewHelpers[helper];
                can.Mustache.registerHelper(helper, viewHelpers[helper]);
            }
        }
    });
