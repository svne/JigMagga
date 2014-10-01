/*global describe, it, before, beforeEach: true*/

'use strict';
var es = require('event-stream');
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');

var WorkerError = require('../../../lib/error').WorkerError;
var stream = require('../../../lib/streamHelper');
var hlp = require('../../../lib/helper');

var mainStream = rewire('../../../lib/mainStream');
var message = require('../../../testData/message.json'); 


describe('mainStream', function () {
    var generator = {
        send: sinon.spy()
    };
    var source = stream.duplex();

    var basePath = '/foo/bar/qaz';
    var configMerge = {
        getConfigStream: function () {
            return es.through(function (data) {
                data.config = {foo: 'bar'};
                this.emit('data', data);
            });
        }
    };

    var helper = {
        getMeta: function (data) {
            return data;
        },
        generateBucketName: function () {
            return 'bucket:name';
        },
        isUrlCorrect: hlp.isUrlCorrect
    };

    var messageStorage = {};

    beforeEach(function () {

        messageStorage.add = sinon.spy();
        helper.isMessageFormatCorrect = sinon.stub();
        mainStream.__set__({configMerge: configMerge, helper: helper, messageStorage: messageStorage});
    });

    it('should forward the message through filter config and spliter stream and send to generator', function (done) {
        helper.isMessageFormatCorrect.returns(true);
        var main = mainStream(source, generator, basePath, {});


        main.on('send:message', function (data) {
            expect(data).to.be.an('object');
            expect(messageStorage.add.called).to.eql(true);
            expect(generator.send.called).to.eql(true);
            var sentData = generator.send.getCall(0).args[1];
            expect(sentData).to.include.keys('config', 'basePath', 'message');
            done();
        });
        source.write({message: message});
    });

    it('should emit error message but continue working if message format incorrect', function (done) {
        helper.isMessageFormatCorrect.returns(false);
        var main = mainStream(source, generator, basePath, {});
        var queueShift = sinon.spy();

        main.on('error:message', function (error) {
            expect(error).to.be.an.instanceOf(WorkerError);
            expect(queueShift.called).to.eql(true);

            done();
        });
        source.write({message: message, queueShift: queueShift});
    });
});