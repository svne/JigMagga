'use strict';

var es = require('event-stream'),
    fs = require('fs'),
    path = require('path'),
    walk = require('walk'),
    md5 = require('MD5'),
    async = require('async'),
    _ = require('lodash');

var WorkerError = require('./error').WorkerError;
var STATUS_CODES = require('./error').STATUS_CODES;
var configMerge = require('./configMerge');
var streamHelper = require('./streamHelper');
var helper = require('./helper');
var generator = require('../generator/lib/generator');

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

StoredMessage.prototype.clear = function () {
    this.onDone = this.onUpload = null;
};


// @type {Object.<string, StoredMessage>}
var messageStorage = {};


var getIdValues = function (message) {
    return _.pick(message, function (value, key) {
        return (new RegExp('.*Id(s|)$', 'ig')).test(key);
    });
};

var domainCache = {};

/**
 * look for domain folder based on base domain and exact domain
 *
 *
 * @param {string} basePath
 * @param {string} baseDomain
 * @param {string} domain
 * @param {function} callback
 */
var lookForDomain = function (basePath, baseDomain, domain, callback) {
    var walker = walk.walk(path.join(basePath, 'page', baseDomain)),
        cacheKey = basePath + baseDomain + domain,
        result;

    if (domainCache[cacheKey]) {
        return callback(null, domainCache[cacheKey]);
    }
    walker.on('directories', function (root, stats, next) {
        var domainExistInFolder = _.some(stats, function (stat) {
            return stat.name === domain;
        });

        if (domainExistInFolder) {

            result = root.replace(basePath + '/page/', '');
        }
        next();
    });

    walker.on('errors', function (root, nodeStatsArray, next) {
        callback(nodeStatsArray);
    });

    walker.on('end', function () {
        if (!result) {
            return callback('There is no such domain');
        }

        domainCache[cacheKey] = path.join(result, domain);
        callback(null, domainCache[cacheKey]);
    });
};

module.exports = {

    /**
     * extend message with prgram arguments and config data
     *
     * @param {object} message
     * @param {object} program
     * @param {object} domainConfig
     */
    extendMessage: function (message, program, domainConfig) {
        domainConfig = domainConfig || {};

        var params = message.params || getIdValues(message),
            locale = program.locale || message.locale;

        params.reset = !program.liveuncached;

        return {
            basedomain: message.basedomain,
            domain: domainConfig.domain || message.basedomain,
            page: message.page || program.page,
            childpage: program.childpage || message.childpage,
            version: program.versionnumber,
            url:  message.url || program.url,
            params: params,
            origMessage: message.origMessage || message,
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
     * @deprecated
     *
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

                result.push(that.extendMessage(message, options));
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


    /**
     *
     * @param {ProcessRouter} queuePool
     * @return {*}
     */
    assignMessageMethods: function (queuePool) {
        /**
         * returns stream that assign queueShift and onDone methods to each message from rabbit
         *
         * @param {{content: Buffer, properties: {contentType: string}}} data
         * @return {{message: object, key: string, queueShift: function}}
         */
        return es.through(function (data) {
            var message = data.message,
                key = data.key;

            data.queueShift = function () {
                queuePool.send('ack:message', key);
            };

            data.onDone = function () {
                //if message has origin field and it is a string it means that it was created
                //by some service(backend, api or salesforce) and we have to publish it to done queue in order
                //to notify them about page generation
                if (_.isString(message.origin)) {
                    queuePool.send('publish:amqpDoneQueue', message);
                }

                //if worker is in "two-bucket-deploy" mode publish message for page that was generated
                //to deploy queue
                queuePool.send('publish:amqpDeployQueue', message);

                generator.deleteCachedCall(data.key);
            };
            this.emit('data', data);
        });
    },

    pageLocaleSplitter: function () {
        function isExternal (link) {
            return link.indexOf('http://') === 0 ||
                link.indexOf('//') === 0 ||
                link.indexOf('https://') === 0;
        }

        function filterLinks(locale, config) {
            return function (page) {
                var pageLink = config.pages[page][locale];
                return pageLink && !isExternal(pageLink) && pageLink.indexOf('{url}') === -1;
            };
        }

        var splitterStrategy = {
            byLocale: function (page, data, config) {
                return  config.locales
                    .filter(function (locale) {
                        return config.pages[page][locale];
                    })
                    .map(function (locale) {
                        var res = _.cloneDeep(data);
                        res.message.locale = locale;
                        return res;
                    });
            },
            byPage: function (locale, data,  config) {
                return Object.keys(config.pages)
                    .filter(filterLinks(locale, config))
                    .map(function (page) {
                        var res =  _.cloneDeep(data);
                        res.message.page = page;
                        res.message.url = page;
                        return res;
                    });
            }
        };

        return streamHelper.asyncThrough(function (data, push, callback) {
            var result = [],
                message = data.message,
                config = data.config;

            try {
                var page = (message.staticOld) ? 'static-old' : message.page;

                if (!message.url && page) {
                    message.url = page;
                }

                if (message.url && page) {
                    if (message.locale) {
                        result.push(data);
                    } else if (isPageInConfig(config, page)) {
                        result = splitterStrategy.byLocale(page, data, config);
                    }
                } else if (!page && config.pages) {

                    if (message.locale) {
                        result = splitterStrategy.byPage(message.locale, data, config);
                    } else {
                        result = config.locales.reduce(function (currentResult, locale) {
                            var localePages = splitterStrategy.byPage(locale, data, config);

                            localePages = localePages.map(function (item) {
                                item.message.locale = locale;
                                return item;
                            });
                            return currentResult.concat(localePages);
                        }, []);
                    }
                }
            } catch (err) {
                push(new WorkerError(err.message || err, data.message, data.key));
                data.queueShift();
                return callback();
            }

            if (!result.length) {
                push(new WorkerError('there is no such pages in config file', data.message, data.key));
                data.queueShift();
                return callback();
            }

            async.forEachSeries(result, function (item, cb) {
                configMerge.getConfig(item, function (err, res) {
                    if (err) {
                        return cb(err);
                    }

                    push(null, res);
                    cb();
                });
            }, function (err) {
                if (err) {
                    push(err);
                }
                callback();
            });

        });
    },

    checkBaseDomain: function (basePath) {
        return streamHelper.map(function (data, callback) {
            var message = data.message;

            if (message.url && message.page ||
                !message.url && !message.page ||
                !message.url && message.page) {
                return callback(null, data);
            }

            var basedomain = message.basedomain + '/' + message.url;

            var pathToDomain = path.join(basePath, basedomain);

            async.waterfall([
                function (next) {
                    fs.exists(pathToDomain, function (exists) {
                        next(null, exists);
                    });
                },
                function (exists, next) {
                    if (exists) {
                        return next(null, basedomain);
                    }
                    lookForDomain(basePath, message.basedomain, message.url, next);
                }
            ], function (err, basedomain) {
                if (err) {
                    return callback(new WorkerError(err, message, null, STATUS_CODES.WRONG_ARGUMENT_ERROR));
                }
                data.message.basedomain = basedomain;
                data.message.url = null;
                callback(null, data);
            });
        });
    },

    validateStream: function (emitter, basePath, config) {
        return streamHelper.asyncThrough(function (data, push, next) {
            if (!helper.isMessageFormatCorrect(data.message, config)) {
                if (_.isFunction(data.queueShift)) {
                    data.queueShift();
                }

                push(new WorkerError('something wrong with message fields', data.message));
                return next();
            }

            if (data.message.url && !helper.isUrlCorrect(data.message.url)) {
                if (_.isFunction(data.queueShift)) {
                    data.queueShift();
                }
                push(new WorkerError('something wrong with message url', data.message));
                return next();
            }

            data.basePath = basePath;
            emitter.emit('new:message', helper.getMeta(data.message));

            push(null, data);
            next();
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

                messageStorage[key].clear();
                delete messageStorage[key];
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
                messageStorage[key].clear();
                delete messageStorage[key];

            }
        }

    }
};
