steal('./funcunit-helper.js',function(){
    steal.instrument.ydStart({
        ignores: ["yd/library/jQuery/*","can/*","funcunit/*", "steal/*", "*test*", "*/lib/*", "jquerypp/*", "*fixture*"],
        onlyShow :[document.location.pathname.substr(0, document.location.pathname.lastIndexOf("/")) + "/*"]
    });
}).then("jquery").then("./qunit/qunit.js", "./qunit/qunit.css").then("./funcunit/funcunit.js").then("./qunit-reporter-junit.js", function () {

        QUnit.init();
        QUnit.start();

});



