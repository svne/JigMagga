'use strict';

var es = require('event-stream'),
    _ = require('lodash');



var isPageInConfig = function (config, page) {
    return config.pages && config.pages[page];
};


module.exports = {

    /**
     * push one message to data array in order to push it to worker
     * later
     *
     * @param {array} dataArr
     * @param {object} message
     * @param {object} options
     */
    createMessage: function (message, options, domainConfig) {
        domainConfig = domainConfig || {};

        var params = options.values || {
            cityId: message.cityId || undefined,
            regionId: message.regionId || undefined,
            districtId: message.districtId || undefined,
            restaurantId: message.restaurantId || undefined,
            linkId: message.linkId || undefined,
            reset: !options.liveuncached ? true : false
        };

        var locale = options.locale || message.locale;

        return {
            basedomain: message.basedomain,
            domain: domainConfig.domain || message.basedomain,
            page: options.page || message.page,
            childpage: message.childpage,
            version: options.versionnumber,
            url: options.url || message.url,
            params: params,
            queue: options.q,
            exc: options.exc,
            origMessage: message,
            locale: locale,
            noMessageAlternatives: options.noMessageAlternatives || undefined
        };
    },

    /**
     * push push all pages frm config as messages to data list
     * @param {array} dataArr
     * @param {object} message
     * @param {object} pagesConf
     * @param {object} options
     * @return {array}
     */
    createAllPages: function (message, pagesConf, options) {
        var that = this,
            result = [],
            locale = message.locale || options.locale;


        Object.keys(pagesConf.pages).forEach(function (page) {
            var pageLink = pagesConf.pages[page][locale];

            if (pageLink && pageLink.indexOf('http://') === -1 && pageLink.indexOf('{url}') === -1) {
                options.page = page;
                options.url = page;

                result.push(that.createMessage(message, options));
            }

        });

        return result;
    },

    getMessageParser: function () {
        return es.through(function (data) {
            var message, result;
            if (_.isArray(data) && data.length === 1) {
                data = data[0];
            }

            if (data.contentType === 'text/plain') {
                message = JSON.parse(data.data.toString('utf-8'));
            }
            if (data.contentType === 'text/json' || (!data.contentType && _.isPlainObject(data))) {
                message = data.data;
            }

            if (message) {
                result = _.cloneDeep(data);
                delete result.data;
                result.message = message;
                this.emit('data', result);
            }
        });
    },

    getSplitter: function () {
        return es.through(function (data) {
            var that = this,
                result = [],
                message = data.message,
                config = data.config;

            if (message.url && message.page) {

                if (message.locale) {
                    result.push(data);
                } else if (isPageInConfig(config, message.page)) {
                    result = config.locales
                        .filter(function (locale) {
                            return config.pages[message.page][locale];
                        })
                        .map(function (locale) {
                            var res = _.cloneDeep(data);
                            res.message.locale = locale;
                            return res;
                        });
                }
            } else if (!message.page && config.pages) {
                var filterLinks = function (locale) {
                    return function (page) {
                        var pageLink = config.pages[page][locale];
                        return pageLink && pageLink.indexOf('http://') === -1 && pageLink.indexOf('{url}') === -1;
                    };
                };

                if (message.locale) {
                    result = Object.keys(config.pages)
                        .filter(filterLinks(message.locale))
                        .map(function (page) {
                            var res = _.cloneDeep(data);
                            res.message.page = page;
                            res.message.url = page;
                            return res;
                        });
                } else {
                    result = config.locales.reduce(function (currentResult, locale) {
                        var localePages = Object.keys(config.pages)
                            .filter(filterLinks(locale))
                            .map(function (page) {
                                var res = _.cloneDeep(data);

                                res.message.page = page;
                                res.message.url = page;
                                res.message.locale = locale;
                                return res;
                            });
                        return currentResult.concat(localePages);
                    }, []);
                }
            }

            result.forEach(function (item) {
                that.emit('data', item);
            });
        });
    }
};