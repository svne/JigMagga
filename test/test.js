steal('./funcunit-helper.js',function(){
    steal.instrument.testStart({
        ignores: ["bower_components/*", "unit/*", "steal/*", "*test*", "*/lib/*", "*fixture*"],
        onlyShow :[document.location.pathname.substr(0, document.location.pathname.lastIndexOf("/")) + "/*"]
    });
}).then("jquery").then("qunit").then("funcunit").then("/testem.js", function () {
    QUnit.load();
});



