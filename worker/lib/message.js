'use strict';

var es = require('event-stream'),
    md5 = require('MD5'),
    _ = require('lodash');

var WorkerError = require('./error').WorkerError;


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
            },
            locale = options.locale || message.locale;

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
     * push push all pages from config as messages to data list
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

    /**
     * create a unique key for message
     * 
     * @param  {object} message
     * @return {string}
     */
    createMessageKey: function (message) {
        var random = String(Math.round(Math.random() * 1000));
        return md5(JSON.stringify(message) + Date.now() + random);
    },

    
    getMessageParser: function () {
        var that = this;
        /**
         * returns stream that parses each message from rabbit
         * 
         * @param {{content: Buffer, properties: {contentType: string}}} data
         * @return {{message: object, key: string, queueShift: function}}
         */
        return es.through(function (data) {
            var message,
                result = {},
                contentType = data.properties.contentType;

            if (_.isArray(data) && data.length === 1) {
                data = data[0];
            }

            if (contentType === 'text/plain') {
                try {
                    message = JSON.parse(data.content.toString('utf-8'));
                } catch (e) {
                    if (_.isFunction(data.queueShift)) {
                        data.queueShift();
                    }
                    this.emit('err', new WorkerError('Date from queue is not JSON', data.content.toString('utf-8')));
                }
            }
            if (contentType === 'text/json' || (!contentType && _.isPlainObject(data))) {
                message = data.content;
            }

            if (message) {
                result.message = message;
                result.key = that.createMessageKey(message);
                if (data.queueShift) {
                    result.queueShift = data.queueShift;
                }
                this.emit('data', result);
            }
        });
    },

    pageLocaleSplitter: function () {
        /**
         * stream that analyze the messages. If there is no locale key inside
         * it emits one message for each locale from the message config
         *
         * The same for page property if there is no page field stream will 
         * emit one message for each static page inside config.
         * 
         * If in the message there are page and locale it just emit this message
         * 
         * @param  {{config: object, message: object}} data
         * @return {object}
         */
        return es.through(function (data) {
            var that = this,
                result = [],
                message = data.message,
                config = data.config;

            function filterLinks(locale) {
                return function (page) {
                    var pageLink = config.pages[page][locale];
                    return pageLink && pageLink.indexOf('http://') === -1 && pageLink.indexOf('{url}') === -1;
                };
            }
            try {
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
            } catch (err) {
                this.emit('err', new WorkerError(err.message || err, data.message, data.key));
            }


            result.forEach(function (item) {
                that.emit('data', item);
            });
        });
    }
};