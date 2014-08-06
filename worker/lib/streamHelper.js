'use strict';

var es = require('event-stream');
var _ = require('lodash');


module.exports = {
    filter: function (predicate) {
        var isAsync = (predicate.length === 2);

        if (!isAsync) {
            return es.through(function (data) {
                if (predicate(data)) {
                    this.emit('data', data);
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

    log: function (client, prefix, level) {
        level = level || 'info';

        return es.through(function (message) {
            client(level, prefix + ' %j', message, _.pick(message.message, ['url', 'page', 'locale']));
            this.emit('data', message);
        });
    },

    duplex: function () {
        return es.through(
            function (data) {
                this.emit('data', data);
            },
            function () {
                this.emit('end');
            });
    },
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
    }
};