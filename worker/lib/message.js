'use strict';

var es = require('event-stream'),
    md5 = require('MD5'),
    _ = require('lodash');

var WorkerError = require('./error').WorkerError;


var isPageInConfig = function (config, page) {
    return config.pages && config.pages[page];
};

/**
 * creates object that represent message in the store
 * each has two methods onDone and onUpload that will be invoked
 * after doneCount or uploadCount equal 0
 * @param {function} onDone
 * @param {function} onUpload
 * @constructor
 */
var StoredMessage = function (onDone, onUpload) {
    this.doneCount = 1;
    this.uploadCount = 1;
    this.onDone = onDone || function () {};
    this.onUpload = onUpload || function () {};
};

StoredMessage.prototype.add = function () {
    this.doneCount += 1;
    this.uploadCount += 1;
};

StoredMessage.prototype.done = function () {
    this.doneCount -= 1;
    if (!this.doneCount) {
        this.onDone();
    }
};

StoredMessage.prototype.upload = function () {
    this.uploadCount -= 1;
    if (!this.uploadCount) {
        this.onUpload();
    }
};

StoredMessage.prototype.isReady = function () {
    return this.uploadCount === 0 && this.doneCount === 0;
};


// @type {Object.<string, StoredMessage>}
var messageStorage = {};

module.exports = {

    /**
     * push one message to data array in order to push it to worker
     * later
     *
     * @param {array} dataArr
     * @param {object} message
     * @param {object} program
     */
    createMessage: function (message, program, domainConfig) {
        domainConfig = domainConfig || {};

        var params = program.values || {
                cityId: message.cityId || undefined,
                regionId: message.regionId || undefined,
                districtId: message.districtId || undefined,
                restaurantId: message.restaurantId || undefined,
                linkId: message.linkId || undefined,
                reset: !program.liveuncached ? true : false
            },
            locale = program.locale || message.locale;

        return {
            basedomain: message.basedomain,
            domain: domainConfig.domain || message.basedomain,
            page: program.page || message.page,
            childpage: program.childpage || message.childpage,
            version: program.versionnumber,
            url: program.url || message.url,
            params: params,
            origMessage: message,
            locale: locale,
            noMessageAlternatives: program.noMessageAlternatives || undefined
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


    getMessageParser: function (queuePool) {
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
                contentType = data.contentType;

            if (_.isArray(data) && data.length === 1) {
                data = data[0];
            }

            if (contentType === 'text/plain' || contentType === 'text/json') {
                try {
                    message = _.isPlainObject(data.data) ?
                        data.data : JSON.parse(data.data.toString('utf-8'));
                } catch (e) {
                    if (_.isFunction(data.queueShift)) {
                        data.queueShift();
                    }
                    this.emit('err', new WorkerError('Date from queue is not JSON', data.content.toString('utf-8')));
                }
            }

            if (message) {
                result.message = message;
                result.key = that.createMessageKey(message);
                result.queueShift = data.queueShift;
                result.onDone = function () {
                    queuePool.amqpDoneQueue.publish(message);

                    if (queuePool.amqpDeployQueue) {
                        queuePool.amqpDeployQueue.publish(message);
                    }
                };
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
                var page = (message.staticOld) ? 'static-old' : message.page;

                if (message.url && page) {

                    if (message.locale) {
                        result.push(data);
                    } else if (isPageInConfig(config, page)) {
                        result = config.locales
                            .filter(function (locale) {
                                return config.pages[page][locale];
                            })
                            .map(function (locale) {
                                var res = _.cloneDeep(data);
                                res.message.locale = locale;
                                return res;
                            });
                    }
                } else if (!page && config.pages) {

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
                return data.queueShift();
            }

            if (!result.length) {
                this.emit('err', new WorkerError('there is no such pages in config file', data.message, data.key));
                return data.queueShift();
            }
            result.forEach(function (item) {
                that.emit('data', item);
            });
        });
    },

    /**
     * object that represent store for messages
     * if you add message with key that already exists it will increment
     * the message counters when done or upload method invokes it decrements
     * counters first and execute callbacks only if the counter value is 0
     * Thus "on api call done" event or upload event will be invoked only after all
     * messages with such key will be uploaded or  api call will be finished
     */
    storage: {

        /**
         * add to storage
         * @param {string} key
         * @param {function} onDone
         * @param {function} onUpload
         */
        add: function (key, onDone, onUpload) {
            if (messageStorage[key]) {
                return messageStorage[key].add();
            }
            messageStorage[key] = new StoredMessage(onDone, onUpload);
        },

        /**
         * reduce done counter or execute oDone function
         *
         * @param {string} key
         */
        done: function (key) {
            if (!messageStorage[key]) {
                return;
            }
            messageStorage[key].done();
            if (messageStorage[key].isReady()) {
                messageStorage[key] = null;
            }
        },

        /**
         * reduce upload counter or execute oUpload function
         *
         * @param {string} key
         */
        upload: function (key) {
            if (!messageStorage[key]) {
                return;
            }
            messageStorage[key].upload();
            if (messageStorage[key].isReady()) {
                messageStorage[key] = null;
            }
        }

    }
};
