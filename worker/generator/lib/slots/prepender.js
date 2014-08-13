'use strict';


exports.invoke = function (string, className, textToAppend) {
    var replaceRegExp = null;
    if (className.charAt(0) !== '.') {
        replaceRegExp = new RegExp('(<[^\\s/>]*' + className + '[^>]*>)', 'ig');

    } else {

        if (className.charAt(0) === '.') {
            className = className.slice(1, className.length);
        }

        replaceRegExp = new RegExp('(<([^\\s>]*)\\s[^>]*class=[\'"][^\'"]*\\b' + className + '[\\s|\'"][^>]*>)', 'ig');

    }

    return string.replace(replaceRegExp, '$1' + textToAppend);
};