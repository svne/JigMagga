steal('./funcunit-helper.js',function(){
    steal.instrument.testStart({
        ignores: ["bower_components/*", "unit/*", "steal/*", "*test*", "*/lib/*", "*fixture*"],
        onlyShow :[document.location.pathname.substr(0, document.location.pathname.lastIndexOf("/")) + "/*"]
    });
}).then("jquery").then("bower_components/qunit/qunit").then("bower_components/funcunit/dist/funcunit.js").then("./qunit-reporter-junit.js", function () {

        QUnit.init();
        QUnit.start();

});



