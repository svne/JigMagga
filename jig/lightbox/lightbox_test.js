steal('test', function () {
    "use strict";
    module("Yd.Jig.Lightbox", {
        setup: function () {
            F.open("./lightbox.html", function(){
                new F.win.Jig.Lightbox(".jig-lightbox", {viewOptions : {

                }});
            });
        }
    });
    test("visible Test", function () {
        //noinspection JSLint
        F(".yd-jig-lightbox-small-content").visible("is visible");
    });
});