'use strict';

var cheerrio = require('cheerio');


exports.invoke = function (string, className, textToAppend) {
    var $ = cheerrio.load(string);

    $(className).each(function () {
        $(this).append(textToAppend);
    });

    return $.html();
};