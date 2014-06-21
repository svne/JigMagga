steal('unit', function () {
    "use strict";
    module("Yd.Jig.Lightbox", {
        setup: function () {
            F.open("jig/lightbox/lightbox.html", function(){

            });
        }
    });
    test("visible Test", function () {
        new F.win.Jig.Lightbox(".jig-lightbox", {viewOptions : {

        }});
        //noinspection JSLint
        ok(true, "is visible");
    });
});