steal('can/util', function () {
    'use strict';

    var stealJson = function (json) {
        if (typeof json !== 'string') {
            json = JSON.stringify(json);
        }

        return 'steal(function() { return ' + json + ';});';
    };

    steal.type('json js', function (options, success, error) {

        if (options.src && typeof options.src.text === 'string' && options.src.text.length) {
            options.text = stealJson(options.src.text);
            return success();
        }

        can.ajax({
            url: '/' + options.id.path,
            success: function (json) {
                options.text = stealJson(json);
                success();
            },
            error: error
        });
    });
});
