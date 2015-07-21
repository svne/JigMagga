'use strict';

var Brod = require('brod-caster'),
    _ = require('lodash');

var envelopeProto = __dirname + '/../messages/envelope.desc',
    messagesProto = __dirname + '/../messages/messages.desc';


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
        }, 3),

        sendToDoneTopic: function (message, callback) {
            callback = callback || function () {};

            if (connectionError) {
                return;
            }

            message.domain = message.basedomain;
            if (message.url === null) {
                delete message.url;
            }

            brod.send(config.origin, 'done', {
                messageType: 'com.takeaway.events.htmlworker.MessageProcessed',
                data: message
            }, {topic: config.doneTopic}, callback);
        }
    };


};
