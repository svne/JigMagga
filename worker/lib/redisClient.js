'use strict';
var konphyg = require('konphyg')(__dirname + '/../config'),
    redis = require('redis');

var config = konphyg.all();

module.exports = function (error, success) {
    success = success || function () {};
    error = error || function () {};

    var redisClient = redis.createClient(config.redis.port, config.redis.host, config.redis.options);

    redisClient.on('ready', success);
    redisClient.on('error', error);
    return redisClient;
};