'use strict';

/**
 * represent a module that listen for new message
 * from pipe ipc and reddis and upload them using 
 * upload content or upload file method
 *
 * @module uploader
 */

var _ = require('lodash'),
    async = require('async'),
    Uploader = require('jmUtil').ydUploader,
    getRedisClient = require('../lib/redisClient'),
    es = require('event-stream');

var log = require('../lib/logger')('uploader', {component: 'uploader', processId: String(process.pid)}),
    ProcessRouter  = require('../lib/router'),
    stream = require('../lib/streamHelper'),
    error = require('../lib/error');

var WorkerError = error.WorkerError;

var config = require('../config');
log('started, pid', process.pid);

var memwatch = require('memwatch');

var uploader = new Uploader(config.main.knox);
var router = new ProcessRouter(process);

var messageStream = stream.duplex();

var REDIS_CHECK_TIMEOUT = 100;

var redisClient = getRedisClient(config.redis, function error(err) {
    log('redis Error %j', err, {redis: true});
});

var handleError = function (text, data) {
    log('error', text, {error: true});

    return router.send('error', new WorkerError(text, data.message.origMessage, data.key));
};


/**
 * create a stream that read a messages from redis if there is no 
 * new messages in redis to upload it increase the timeout between reads
 * if the timeout is more then 5 sec it pauses stream
 * Method tries to find a messages in the redis list and take 50 first of them
 * by range. After obtaining some amount of messages it removes them from the list 
 * 
 * @param  {object} client
 * @param  {string} listKey [description]
 * @return {Redable}
 */
var createRedisListStream = function (client, listKey) {

    return es.readable(function (count, callback) {
        var that = this;

        async.waterfall([
            function (next) {
                setTimeout(function () {
                    client.lrange(listKey, 0, 50, next);
                }, REDIS_CHECK_TIMEOUT);
            },
            function (result, next) {
                if (!result.length) {
                    REDIS_CHECK_TIMEOUT *= 2;
                    if (REDIS_CHECK_TIMEOUT > 5000) {
                        REDIS_CHECK_TIMEOUT = 5000;
                        that.pause();
                    }
                    return callback();
                }
                that.pause();
                log('[createRedisListStream] obtained records length: %d', result.length);
                that.emit('data', result);
                client.ltrim(listKey, result.length, -1, next);
            }
        ], function (err) {
            callback(err);
        });
   });
};

var redisListStream = createRedisListStream(redisClient, config.redis.keys.list);
redisListStream.pause();

router.addRoutes({
    pipe: function (data) {
        messageStream.write(data);
    },
    'new:zip': function (data) {
        messageStream.write(data);
    },
    'reduce:timeout': function () {
        REDIS_CHECK_TIMEOUT = 100;
        redisListStream.resume();
    }
});

var uploadsAmount = 0;

/**
 * upload item using uploadFile method if there is a zipPath field 
 * and uploadContent if there is a data field
 * 
 * @param  {data}   data
 * @param  {Function} callback [description]
 */
var uploadItem = function (data, callback) {
    if (_.isString(data)) {
        data = JSON.parse(data);
    }

    var next = function (err, res) {
        if (err) {
            handleError(err, {upload: true, url: data.url});
        } else {
            uploadsAmount += 1;
            log('success', res, {upload: true, url: data.url, uploadsAmount: uploadsAmount});
            router.send('message:uploaded', data.messageKey);
        }
        callback();
    };

    log('start uploading new file url: %s', data.url);

    if (data.zipPath) {
        return uploader.uploadFile(data.zipPath, data.url, {deleteAfter: true}, next);
    }

    uploader.uploadContent(new Buffer(data.data), data.url, {
        headers: {'X-Myra-Unzip': 1},
        type: 'application/octet-stream'
    }, next);
};

/**
 * returns stream that upload each message or array of messages
 * 
 * @param  {object} source
 */
var uploadStream = function (source) {
    return es.map(function (data, callback) {
        var next = function (err, res) {
            if (source) {
                source.resume();
            }
            callback(err, res);
        };

        if (_.isArray(data)) {
            log('new data to upload type: array length:', data.length);
            return async.each(data, uploadItem, next);
        }

        log('new data to upload type: string');
        uploadItem(data, next);
    });
};


redisClient.on('ready', function () {
    log('redis client is ready', {redis: true});

    redisListStream.pipe(uploadStream(redisListStream));

    process.send({ready: true});
});

messageStream.pipe(uploadStream());


process.on('uncaughtException', error.getErrorHandler(log, function (err) {
    router.send('error', err);
}));

memwatch.on('leak', function (info) {
    log('warn', '[MEMORY:LEAK] %j', info, {memoryLeak: true});
});