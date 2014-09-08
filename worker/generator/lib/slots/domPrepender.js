'use strict';

var cheerrio = require('cheerio');


exports.invoke = function (string, className, textToAppend) {
    var $ = cheerrio.load(string);
    if (className.charAt(0) !== '.') {
        className = '.' + className;
    }

    $(className).each(function () {
        $(this).prepend(textToAppend);
    });

    return $.html();
};