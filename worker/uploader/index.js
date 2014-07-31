'use strict';

var fs = require('fs'),
    Uploader = require('jmUtil').ydUploader,
    getRedisClient = require('../lib/redisClient'),
    es = require('event-stream');

var ProcessRouter  = require('../lib/router'),
    stream = require('../lib/streamHelper');

var config = require('../config');

var uploader = new Uploader(config.main.knox);
var router = new ProcessRouter(process);

var messageStream = stream.duplex();

router.addRoutes({
    pipe: function (data) {
        messageStream.write(data);
    }
});


var redisClient = getRedisClient(function error(err) {
    console.log("[Redis] Error " + err);
});

var createRedisListStream = function (client, listKey) {
   return es.readable(function (count, callback) {
       var that = this;
       client.lpop(listKey, function (err, data) {
           if (data) {
               router.send('log', 'new message in list');
               that.emit('data', data);
           }

           callback(err);
       });
   });
};

redisClient.on('ready', function () {
    console.log('[uploader:Redis] client is ready');

    createRedisListStream(redisClient, config.redis.keys.list)
        .pipe(es.map(function (data, callback) {
            data = JSON.parse(data);

            router.send('log', 'start uploading new file', data.url);
            uploader.uploadContent(new Buffer(data.data), data.url, callback, callback, {
                headers: {'X-Myra-Unzip': 1},
                type: 'application/octet-stream'
            });
        }))
        .on('finish', function () {
            router.send('log', 'finished!');
        });
});


