/**
 * TODO split this view helper in different modules to not require each view layer also when they are not used
 */
steal(
    "lib/view-helpers/view-helper-object.js",
    "can/util",
    'can/view/ejs',
    'can/view/mustache',
    'can/view/stache',
    function (viewHelpers) {
        "use strict";
        var helper;
        
        for (helper in viewHelpers) {
            if (viewHelpers.hasOwnProperty(helper)) {
                can.EJS.Helpers.prototype[helper] = viewHelpers[helper];
                can.Mustache.registerHelper(helper, viewHelpers[helper]);
                can.stache.registerHelper(helper, viewHelpers[helper]);

            }
        }
    });
