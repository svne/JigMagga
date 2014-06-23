/**
 * extension for steal instrument to ignore files
 */
steal('steal/instrument', function () {
    var oldIgnoreFn = steal.instrument.utils.shouldIgnore;

    steal.instrument.testStart =  function (config) {
        if (config.ignores && config.ignores.length) {
            steal.instrument.ignores = config.ignores;
        }
        if (config.onlyShow && config.onlyShow.length) {
            steal.instrument.onlyShow = config.onlyShow;
        }
    };

    steal.instrument.utils.shouldIgnore = function (options) {
        var returnValue = false;
        if (steal.instrument.onlyShow) {
            var actual;
            for (var i = 0 , len = steal.instrument.onlyShow.length; i < len; i++) {
                actual = steal.instrument.onlyShow[i];
                if ((options.src + "").search(actual) === -1) {
                    returnValue = true;
                    break;
                }
            }
        }
        return returnValue || oldIgnoreFn(options);
    };
});