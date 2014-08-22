!function () {
    /**
     * sass import fn
     * 
     * transform object sass variables from a conf file to a sass syntax
     * @param sassSteal
     * @returns {string}
     */
    function sassImportFn(sassSteal, transform) {
        var sassText = "";

        if (sassSteal) {
            // set normal variables as sass variables
            for (var key in sassSteal) {
                sassText += "$" + key + ": " + sassSteal[key] + ";\n";
            }
            if(typeof transform === "function"){
                sassText += transform(sassSteal, sassText);
            }
        }
        return sassText;
    }

    //steal export
    if (typeof steal !== 'undefined') {
        steal(function () {
            return {
                sassImportFn : sassImportFn
            };
        });
    }

    //node export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            sassImportFn : sassImportFn
        };
    }

}();