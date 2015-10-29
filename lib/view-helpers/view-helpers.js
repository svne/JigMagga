steal(
    "lib/view-helpers/view-helper-object.js",
    "can/util",
    'can/view/ejs',
    'can/view/mustache',
    function (viewHelpers) {
        "use strict";
        var helper;

        // due to Yd.Jig.Register: agb: _("yd-jig-register-terms-agree", '<a target="_blank" href="' + viewHelperObject.staticLink('
        window.viewHelperObject = viewHelpers;

        for (helper in viewHelpers) {
            if (viewHelpers.hasOwnProperty(helper)) {
                can.EJS.Helpers.prototype[helper] = viewHelpers[helper];
                can.Mustache.registerHelper(helper, viewHelpers[helper]);
            }
        }
    });
