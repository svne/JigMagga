'use strict';
var redis = require('redis');


/**
 * create a redis client with a
 * @param  {{port: number, host: string, options: object}} config
 * @param  {function} error
 * @param  {function} success
 * @return {object}
 */
module.exports = function (config, error, success) {
    success = success || function () {};
    error = error || function () {};

    var redisClient = redis.createClient(config.port, config.host, config.options);

    redisClient.on('ready', success);
    redisClient.on('error', error);
    return redisClient;
};