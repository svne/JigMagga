'use strict';

var es = require('event-stream');

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

    log: function (prefix, level) {
        level = level || 'log';

        return es.through(function (message) {
            console[level](prefix, message);
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