steal("test",function () {
    "use strict";
    module("Jig.Lightbox", {
        setup: function () {
            stop();
            F.open("/jig/lightbox/lightbox.html", function(){
                new F.win.Jig.Lightbox(".jig-lightbox", {viewOptions : {

                }});
                start();
            });
        }
    });
    test("visible Test", function () {
        //noinspection JSLint
        ok(true);
    });
});
