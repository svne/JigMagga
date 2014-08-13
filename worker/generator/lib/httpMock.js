'use strict';
var http = require('http-get');

var mocks = [
    {
        regexp: new RegExp('restaurant\/[\\d]+\\?$', 'gi'),
        data: require('../../testData/restaurant.json')
    },
    {
        regexp: new RegExp('restaurant\/[\\d]+\/discounts\\?$', 'gi'),
        data: require('../../testData/restaurant_discount.json')
    },
    {
        regexp: new RegExp('restaurant\/[\\d]+\/menu\\?$', 'gi'),
        data: require('../../testData/restaurant_menu.json')
    }
];


exports.get = function (options, callback) {
    var url = options.url,
        result = {},
        mock;

    mocks.some(function (item) {
        if(item.regexp.test(url)) {
            mock = item;
            return true;
        }
    });

    if (!mock) {
        console.log('[mock] there is no mock for url', url);
        return http.get(options, callback);
    }
    result.buffer = new Buffer(JSON.stringify(mock.data));
    process.nextTick(function () {
        callback(null, result);
    });
};
