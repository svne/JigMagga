steal('test', function () {
    "use strict";

    module("Cdn.Jig.Queuemonitor", {
        setup: function () {
            F.open("/cdn/jig/queuemonitor/test/queuemonitor.html", function(){
                stop()
                F.win.steal.config("domain", "default");
                F.win.steal("cdn/jig/queuemonitor/test/queuemonitor.conf", function(){
                start();
                });
            });
        }
    });

    test("visible Test", function () {
        //TODO implement testacse for Cdn.Jig.Queuemonitor
        ok(false, "no testcase")
    });
});
