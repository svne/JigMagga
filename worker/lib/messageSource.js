'use strict';

/**
 * module represents methods that allows to create a source
 * Source is a Readable stream that can send to the consumer
 * one or more messages
 * 
 * @module messageSource
 */

var path = require('path');
var es = require('event-stream');
var _ = require('lodash');
var amqp = require('./amqp');

var config = require('../config');
var stream = require('./streamHelper');
var helper = require('./helper');
var messageHelper = require('./message');


module.exports = {
    /**
     * return a stream with messages from amqp queues. 
     * Obtains a queue names using helper.getQueNames create an array
     * of stream for each of queues in the list merge them in one stream
     * and pipe to the messageParser
     * 
     * @param  {object} program
     * @param  {Functon} log     - function that could be used for logging
     * @return {Readable}
     */
    getQueueSource: function (program, log) {
        var connection = amqp.getConnection(config.amqp.credentials);
        var queues = helper.getQueNames(program, config.amqp);

        log('queues %j', queues, {});

        var queueStreams = _.values(queues).map(function (queueName) {
            var amqpStream = amqp.getStream({
                queue: queueName,
                exchange: 'amq.direct',
                connection: connection,
                prefetch: config.amqp.prefetch
            });
            amqpStream.on('ready', function (queue) {
                log('%s is connected', queue);
            });
            return amqpStream;
        });

        return es.merge.apply(es, queueStreams)
            .pipe(messageHelper.getMessageParser())
            .pipe(es.through(function (data) {
                log('message parsed %j', data, helper.getMeta(data.message));
                this.emit('data', data);
            }));
    },

    /**
     * create a message from the application arguments and 
     * push it to the readable stream
     *
     * 
     * @param  {object} program
     * @param  {Functon} log     - function that could be used for logging
     * @return {Readable}
     */
    getDefaultSource: function (program, log) {
        var data = {
            //grab 'basedomain', 'url', 'page', 'locale' from arguments to the message
            message: _.pick(program, ['basedomain', 'url', 'page', 'locale'])
        };
        var values = {};

        if (program.values) {
            values = JSON.parse(program.values);
        } else {
            //grab all keys that ended on Id from arguments to the message
            values = _.pick(program, function (value, key) {
                return (new RegExp('.*Id$', 'ig')).test(key);
            });
        }
        data.message = _.assign(data.message, values);
        log('creating source from command line kyes', helper.getMeta(data.message));
        return es.readArray([data]);
    },

    /**
     * obtains all static-old page create a message from each of them
     * and return a stream with all of those messages
     * 
     * @param  {object} program
     * @param  {Function} log
     * @param  {string} basePath
     * @return {Readable}
     */
    getStaticOldSource: function (program, log, basePath) {
        if (!program.basedomain) {
            throw new Error('can not work without basedomain');
        }
        var duplex = stream.duplex();
        var message = _.pick(program, ['basedomain', 'locale']);
        log('creating source from static-old pages');
        var staticOldPath = path.join(basePath, 'page', program.basedomain, 'static-old');

        helper.getFolderFiles(staticOldPath, function (file) {
            return (new RegExp('^[^_].+\\.html$')).test(file.name);
        }, function (err, files) {
            if (!files.length) {
                log('error', 'there is no static-old for this domain');
            }

            files.map(function (file) {
                var url = file.path.replace(staticOldPath + '/', '').replace(/\.html$/g, '');
                return {
                    message: {
                        locale: message.locale,
                        basedomain: message.basedomain,
                        url: url,
                        page: 'static-old/' + url,
                        staticOld: true
                    }
                };
            })
            .forEach(function (file) {
                log('starting generation of new static old page %j', file, {});
                duplex.write(file);
            });
            duplex.end();
        });

        return duplex;
    }
};