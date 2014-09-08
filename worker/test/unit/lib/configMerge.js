/*global describe, it, before, beforeEach: true*/

'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');

var WorkerError = require('../../../lib/error').WorkerError;

var message = require('../../../testData/message.json'); 

var configMerge =rewire('../../../lib/configMerge');

describe('configMerge', function () {
    describe('#getConfigStream', function () {
        var configMergeStub = {};
        var basePath = '/foo/bat/qaz';

        var data;
        var config = {foo: 1};

        beforeEach(function () {
            data = {
                message: message,
                basePath: basePath
            };
            configMergeStub.getPageConfig = sinon.stub();

            configMerge.__set__('configMerge', configMergeStub);
        });

        it('should create config if there is no isPageConfigLoaded flag and set this flag is there is page property in message', function (done) {
            configMergeStub.getPageConfig.callsArgWithAsync(3, null, config);

            var stream = configMerge.getConfigStream();
            
            stream.on('data', function (res) {
                expect(res).to.include.keys('message', 'config', 'isPageConfigLoaded', 'basePath');
                expect(configMergeStub.getPageConfig.called).to.eql(true);
                var getPageConfig = configMergeStub.getPageConfig.getCall(0);

                expect(getPageConfig.args).to.contain(basePath + '/page', message.basedomain, message.page);
                done();
            });

            stream.write(data);
        });

        it('should not call getPageConfig if page config already loaded', function (done) {
            data.isPageConfigLoaded = true;
            var stream = configMerge.getConfigStream();
            
            stream.on('data', function (res) {
                expect(res).to.include.keys('message', 'isPageConfigLoaded', 'basePath');
                expect(configMergeStub.getPageConfig.called).to.eql(false);
                done();
            });

            stream.write(data);
        });

        it('should should emit err message with WorkerError if error in getPageConfig happened', function (done) {
            configMergeStub.getPageConfig.callsArgWithAsync(3, 'some error');

            var stream = configMerge.getConfigStream();
            
            stream.on('error', function (err) {
                expect(err).to.be.an.instanceOf(WorkerError);
                expect(err.originalMessage).to.eql(message);
                done();
            });

            stream.write(data);
        });
    });
});