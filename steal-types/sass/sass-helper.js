!function () {
    /**
     * sass import fn
     * 
     * transform object sass variables from a conf file to a sass syntax
     * @param sassSteal
     * @returns {string}
     */
    function sassImportFn(sassSteal, transform) {
        var sassyJigConfig = false,
            prefix,
            suffix;

        if (Yd.config && Yd.config.jigs) {
            sassyJigConfig = JSON.stringify(Yd.config.jigs, null, 4);
            prefix = "$config-jigs: ";
            suffix = ";";

            sassyJigConfig = sassyJigConfig.replace(/{/g, "(");
            sassyJigConfig = sassyJigConfig.replace(/}/g, ")");
            sassyJigConfig = sassyJigConfig.replace(/\[/g, "(");
            sassyJigConfig = sassyJigConfig.replace(/]/g, ")");
            sassyJigConfig = sassyJigConfig.replace(/"([^"']+)":/g, "$1: ");
            sassyJigConfig = sassyJigConfig.replace(/"([^"']+(px|%))"/g, "$1");
            sassyJigConfig = sassyJigConfig.replace(/"/g, "'");
            sassyJigConfig = sassyJigConfig.replace(/\s*\B(\.)/g, " ");
            sassyJigConfig = prefix + sassyJigConfig + suffix;
        }

        //console.log(prefix + sassyJigConfig + suffix);
        var sassText = "";

        if(sassyJigConfig) {
            sassText += sassyJigConfig;
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