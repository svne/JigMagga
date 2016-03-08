!function () {
    /**
     * sass import fn
     * 
     * transform object sass variables from a conf file to a sass syntax
     * @param sassSteal
     * @returns {string}
     */
    function sassImportFn(sassSteal, transform, additionalData) {
        var sassText = "";

        if (additionalData) {
            sassText += jsonToSass(additionalData);
        }

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

    function jsonToSass(data) {
        var sass = "",
            sassMap,
            prefix,
            suffix = ";\n";

        if (data.length) {
            for (var i=0; i < data.length; i++) {
                prefix = (data[i].var ? data[i].var : "$json-sass") + ": ";
                sassMap = JSON.stringify(data[i].data, null, 4);

                sassMap = sassMap.replace(/{/g, "(");
                sassMap = sassMap.replace(/}/g, ")");
                sassMap = sassMap.replace(/\[/g, "(");
                sassMap = sassMap.replace(/]/g, ")");
                sassMap = sassMap.replace(/"([^\/"']+)":/g, "$1: ");
                sassMap = sassMap.replace(/"([^"']+(px|%))"/g, "$1");
                sassMap = sassMap.replace(/\s*\B(\.)/g, " ");

                sass += prefix + sassMap + suffix;
            }
        }
        return sass;
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