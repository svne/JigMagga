'use strict';

var _ = require('lodash');
var path = require('path');


/**
 * deploy to the given object and it ancestors a attr function
 *
 * @author Matthias Laug <laug@lieferando.de>
 * @param container
 * @return {*}
 */
exports.deployAttr = function deployAttr(container) {
    if (container && !container.attr) {
        if (typeof container === "object" && container.constructor != Array) {
            container.attr = function (item) {
                return this[item];
            };
            for (var key in container) {
                if (container.hasOwnProperty(key)) {
                    if (typeof container[key] == "object" && container[key] != null) {
                        container[key] = deployAttr(container[key]);
                    }
                }
            }
        }
        else if (container.constructor === Array) {
            for (var i = 0; i < container.length; i++) {
                container[i] = deployAttr(container[i]);
            }
        }
    }
    return container;
}

exports.utf8_decode = function (str_data) {
    // http://kevin.vanzonneveld.net
    // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
    // +      input by: Aman Gupta
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: Norman "zEh" Fuchs
    // +   bugfixed by: hitwork
    // +   bugfixed by: Onno Marsman
    // +      input by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // *     example 1: utf8_decode('Kevin van Zonneveld');
    // *     returns 1: 'Kevin van Zonneveld'
    var tmp_arr = [],
        i = 0,
        ac = 0,
        c1 = 0,
        c2 = 0,
        c3 = 0;

    str_data += '';

    while (i < str_data.length) {
        c1 = str_data.charCodeAt(i);
        if (c1 < 128) {
            tmp_arr[ac++] = String.fromCharCode(c1);
            i++;
        } else if (c1 > 191 && c1 < 224) {
            c2 = str_data.charCodeAt(i + 1);
            tmp_arr[ac++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            i += 2;
        } else {
            c2 = str_data.charCodeAt(i + 1);
            c3 = str_data.charCodeAt(i + 2);
            tmp_arr[ac++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        }
    }

    return tmp_arr.join('');
}



/**
 * code to be used in our views on ejs, that needs to be available to the worker as well
 *
 * @author wasn't me
 * @type {Object}
 */


var list =  function (coll, fn) {
    var i = 0,
        l;
    if (coll) {
        if (coll.constructor === Array) {
            for (l = coll.length; i < l; i++) {
                fn(coll[i], i);
            }
        }
        else {
            for (var key in coll) {
                if (coll.hasOwnProperty(key)) {
                    fn(coll[key], key);
                }
            }
        }
    }

};


exports.getHelper = function (namespace) {
    var helper = {list: list},
        pathToProjectModule = path.join('../../..', namespace, 'library/view-helper-object'),
        pathToGlobalModule = '../../../lib/view-helpers/view-helper-object.js';

    helper = _.assign(helper, require(pathToGlobalModule));
    try {
        helper = _.assign(helper, require(pathToModule));
    } catch (e) {} finally {
        return helper;
    }

};

