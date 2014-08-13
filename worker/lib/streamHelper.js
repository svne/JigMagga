'use strict';

var es = require('event-stream');
var _ = require('lodash');


module.exports = {
    /**
     * filter message in stream by predicate
     * 
     * @param  {function} predicate
     * @return {Duplex}
     */
    filter: function (predicate) {
        var isAsync = (predicate.length === 2);

        if (!isAsync) {
            return es.through(function (data) {
                try {
                    if (predicate(data)) {
                        this.emit('data', data);
                    }
                } catch (e) {
                    this.emit('error', e);
                }
            });
        }

        return es.map(function (data, callback) {
            predicate(data, function (err, res) {
                if (err) {
                    return callback(err);
                }
                if (res) {
                    return callback(null, data);
                }
                callback();
            });
        });
    },

    /**
     * log messages in stream via log function 
     * 
     * @param  {function} client
     * @param  {string} prefix
     * @param  {string} level
     * @return {Duplex}
     */
    log: function (client, prefix, level) {
        level = level || 'info';

        return es.through(function (message) {
            client(level, prefix + ' %j', message, _.pick(message.message, ['url', 'page', 'locale']));
            this.emit('data', message);
        });
    },

    /**
     * create a duplex stream that obtain message and emit it to consumer
     * 
     * @return {Duplex}
     */
    duplex: function () {
        return es.through(
            function (data) {
                this.emit('data', data);
            },
            function () {
                this.emit('end');
            });
    },

    /**
     * returns stream that collect all messages in a buffer
     * and emit one accumulated message when the end event 
     * is fired 
     * 
     * @param  {Function} callback
     */
    accumulate: function (callback) {
        var buffer = new Buffer(0);

        return es.through(function write(data) {
            if (!Buffer.isBuffer(data)) {
                data = new Buffer(JSON.stringify(data));
            }
            buffer = Buffer.concat([buffer, data]);
        }, function end() {
            var that = this;

            function next() {
                that.emit('end');
                buffer = new Buffer(0);
            }

            callback(null, buffer, next);
        });
    },
    tryCatch: function () {
        var streams = [];

        var tryCatch = function (stream) {
            streams.push(stream);
            return stream;
        };

        tryCatch.catch = function (handler) {
            _.each(streams, function (stream) {
                stream.on('error', handler);
            });
        };

        return tryCatch;
    }
};