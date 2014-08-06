'use strict';

var memwatch = require('memwatch'),
    _ = require('lodash'),
    async = require('async'),
    Uploader = require('jmUtil').ydUploader,
    getRedisClient = require('../lib/redisClient'),
    es = require('event-stream');

var log = require('../lib/logger')('uploader', {component: 'uploader', processId: String(process.pid)}),
    ProcessRouter  = require('../lib/router'),
    stream = require('../lib/streamHelper');

var config = require('../config');
log('started, pid', process.pid);

var uploader = new Uploader(config.main.knox);
var router = new ProcessRouter(process);

var messageStream = stream.duplex();

var REDIS_CHECK_TIMEOUT = 100;

var redisClient = getRedisClient(function error(err) {
    log('redis Error %j', err, {redis: true});
});

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
    'reduce:timeout': function () {
        REDIS_CHECK_TIMEOUT = 100;
        redisListStream.resume();
    }
});


var uploadItem = function (data, callback) {
    if (_.isString(data)) {
        data = JSON.parse(data);
    }

    log('start uploading new file url: %s', data.url);
    uploader.uploadContent(new Buffer(data.data), data.url, {
        headers: {'X-Myra-Unzip': 1},
        type: 'application/octet-stream'
    }, function (err, res) {
        if (err) {
            log('fail', err, {upload: true, url: data.url});
        } else {
            log('success', res, {upload: true, url: data.url});
        }
        callback();
    });
};


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


process.on('uncaughtException', function (err) {
    console.log(err, err.stack);
    log('error', '%s %j', err, err.stack, {uncaughtException: true});
    process.kill();
});

memwatch.on('leak', function(info) {
    log('warning', '[MEMORY:LEAK] %j', info, {memoryLeak: true});
});