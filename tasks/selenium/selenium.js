var fs = require("fs"),
    path = require("path");

module.exports = function(grunt){


    return {

        renderSEBuilderSuite: function (suite, options) {
            var loadedFile;
            suite.type = "script";
            suite.steps = [];
            if(suite && suite.scripts){
                suite.scripts.forEach(function(item){
                    loadedFile = grunt.file.readJSON(path.join(options.path.replace(/\/[^/]*.json$/, ""), item.path));
                    if(loadedFile && loadedFile.steps){
                        suite.steps = suite.steps.concat(loadedFile.steps);
                    }
                });
            }
            return suite;
        }
    };


};


