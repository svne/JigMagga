'use strict';

var Brod = require('brod-caster'),
    Protobuf = require('node-protobuf'),
    fs = require('fs'),
    _ = require('lodash');

var envelopeProto = new Protobuf(fs.readFileSync(__dirname + '/../messages/envelope.desc')),
    messagesProto = new Protobuf(fs.readFileSync(__dirname + '/../messages/page.desc'));

var producer;

/**
 *
 * @param {{connectionString: string, clientId: string, zkOptions: object, topics: object}} config
 * @return {exports.Producer}
 */
module.exports = function (config) {
    config = config || {};

    config.adaptor = config.adaptor || {};
    config.adaptor.envelope = envelopeProto;
    config.adaptor.messages = messagesProto;

    if (producer) {
        return producer;
    }
    var connectionError = null;

    var brod = new Brod(config);

    return {
        sendToWarehouse: _.curry(function (formatter, status, message, callback) {
            formatter = formatter || function bareMessage(msg, cb) {
                return cb(null, msg);
            };
            callback = callback || function () {};

            if (connectionError) {
                return;
            }
            formatter(status, message, function (err, formattedMessage) {
                if (err) {
                    return callback(err);
                }

                brod.send(config.origin, status, formattedMessage, callback);
            });
        }, 3)
    };


};