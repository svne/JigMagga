steal("test",function () {
    "use strict";
    module("Jig.Lightbox", {
        setup: function () {
            F.open( steal.URI( "./" ).normalize().toString() + "lightbox.html", function(){
                new F.win.Jig.Lightbox(".jig-lightbox", {viewOptions : {

                }});
            });
        }
    });
    test("visible Test", function () {
        //noinspection JSLint
        F(".jig-lightbox-small-content").visible("is visible");
    });
});
