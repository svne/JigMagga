/*global describe, it, before, beforeEach: true*/

'use strict';

var format = require('util').format;
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');
var message = require('../../../../testData/message.json'); 

var generateConfig = rewire('../../../../generator/lib/generateConfig');

message.origMessage = _.clone(message);
message.domain = message.basedomain;
var template = fs.readFileSync(path.join(__dirname, '../../../../testData/testTemplate.html'));


describe('generateConfig', function () {
    var baseConfig = {
        pages: {
            'menu': {'de_DE': '/url_to_upload'}
        },
        locales: ['de_DE']
    };
    var basePath = '/foo/bar/lieferando.de/yd';
    var workerConfig = {api: 'api'};

    var fsStub = {
        readFile: sinon.stub()
    };
    var obtainTemplate = sinon.stub();
    var version = {version: 2.5};
    var tplPath = 'foo/bar/bar';

    before(function () {
        fsStub.readFile.callsArgWithAsync(1, null, JSON.stringify(version));
        obtainTemplate.callsArgWithAsync(2, null, {content: template, path: tplPath});
        generateConfig.__set__({
            fs: fsStub,
            obtainTemplate: obtainTemplate
        });
    });

    var data = {
        message: message,
        config: baseConfig,
        basePath: basePath
    };
    it('should create the config with correct keys', function (done) {

        generateConfig(data, workerConfig, function (err, result) {
            expect(err).to.eql(null);
            expect(result).to.be.an('object');
            expect(result).to.include.keys('message', 'config', 'basePath', 'locale', 'isMainLocale');
            var config = result.config;

            expect(config.pagePath).to.eql(tplPath + '/');
            expect(config.url).to.eql(message.url);
            expect('/' + config.uploadUrl).to.eql(config.pages.menu.de_DE);
            expect(config.scriptName).to.contain(version.version, config.locales[0], basePath);
            expect(config.domain).to.eql(message.domain);
            expect(config.apiConfig).to.eql(workerConfig.api);

            done();
        });
    });

    it('should extend config with viewContainer', function (done) {
        generateConfig(data, workerConfig, function (err, result) {
            expect(err).to.eql(null);
            var config = result.config;
            var viewContainer = config.viewContainer;
            expect(viewContainer.shtml).to.eql(false);
            expect(viewContainer.IS_WORKER).to.eql(true);
            expect(viewContainer.domain).to.eql(message.domain);
            expect(viewContainer.pagePath).to.contain(message.page, message.domain);
            expect(viewContainer.filename).to.contain(tplPath, message.page + '.html');

            done();
        });
    });
    it('should extend config with predefined object', function (done) {
        generateConfig(data, workerConfig, function (err, result) {
            expect(err).to.eql(null);
            var config = result.config;

            var predefined = config.predefined;

            expect(predefined.country).to.eql('DE');
            expect(predefined.locale).to.eql(data.locale);
            expect(predefined.url).to.eql(data.message.url);
            expect(predefined.pageType).to.eql(data.message.page);

            done();
        });
    });

    it('should use correct paths if page is staticOld', function (done) {
        data.message.origMessage.staticOld = true;
        generateConfig(data, workerConfig, function (err, result) {
            expect(err).to.eql(null);
            var config = result.config;
            expect(config.viewContainer.filename).to.eql('foo/bar/menu.html');
            expect(config.scriptName).to.eql('yd/page/lieferservice.de/static-old/production-de_DE-2.5.js');
            done();
        });
    });

    it('should extend config with child-page if them exist', function (done) {
        data.message.childpage = 'foo';
        data.config['child-pages'] = {
            foo: {
                'bar': 1,
                'qaz': 2
            }
        };
    
        generateConfig(data, workerConfig, function (err, result) {
            expect(err).to.eql(null);
            var config = result.config;
            expect(config.bar).to.eql(1);
            expect(config.qaz).to.eql(2);
            done();
        });
    });

    it('should extend config with domain page if them exist', function (done) {
        data.config['domain-pages'] = {
            'lieferservice.de': {
                'bar': 1,
                'qaz': 2
            }
        };
    
        generateConfig(data, workerConfig, function (err, result) {
            expect(err).to.eql(null);
            var config = result.config;
            expect(config.bar).to.eql(1);
            expect(config.qaz).to.eql(2);
            done();
        });
    });

    describe('obtainTemplate', function () {
        var obtainTemplate = generateConfig.__get__('obtainTemplate');

        var fsStub = {};
        var basePath = '/foo/bar/qaz';

        beforeEach(function () {
            fsStub.readFile = sinon.stub();
            generateConfig.__set__('fs', fsStub);
        });

        it('should return template from domain folder if it exists', function (done) {
            var domainPagePath = path.join(basePath, 'page', message.basedomain, message.page);

            fsStub.readFile.onCall(0).callsArgWithAsync(1, null, template);
            obtainTemplate(message, basePath, function (err, res) {
                expect(err).to.be.a('null');
                expect(res).to.be.an('object')
                    .to.include.keys('path', 'content');
                
                expect(res.path).to.eql(domainPagePath);
                
                expect(res.content)
                    .to.contain(format('<html lang="%s" id="%s"', 'de', 'de'))
                    .to.contain('<% include')
                    .to.not.contain('<!--#include');
                
                done();
            });
        });

        it('should return template from default folder if there is no such page in the domain', function (done) {
            var defaultPagePath = path.join(basePath, 'page/default', message.page);
            generateConfig.__set__('isFileNotExist', function () {
                return true;
            });
            fsStub.readFile.onCall(0).callsArgWithAsync(1, true);
            fsStub.readFile.onCall(1).callsArgWithAsync(1, null, template);

            obtainTemplate(message, basePath, function (err, res) {
                expect(err).to.be.a('null');
                expect(fsStub.readFile.calledTwice).eql(true);
                expect(res).to.be.an('object')
                    .to.include.keys('path', 'content');
                expect(res.path).to.eql(defaultPagePath);
                done();
            });
        });

        it('should return error if it happened while obtaining file from domain path', function (done) {
            var error = 'foo bar';
            generateConfig.__set__('isFileNotExist', function () {
                return false;
            });
            fsStub.readFile.onCall(0).callsArgWithAsync(1, error);

            obtainTemplate(message, basePath, function (err, res) {
                expect(err).to.eql(error);
                expect(res).to.be.an('undefined');
                done();
            });
        });

        it('should return error if it happened while obtaining file from default path', function (done) {
            var error = 'foo bar';
            generateConfig.__set__('isFileNotExist', function () {
                return true;
            });
            fsStub.readFile.onCall(0).callsArgWithAsync(1, true);
            fsStub.readFile.onCall(1).callsArgWithAsync(1, error);


            obtainTemplate(message, basePath, function (err, res) {
                expect(err).to.eql(error);
                expect(fsStub.readFile.calledTwice).eql(true);
                expect(res).to.be.an('undefined');
                done();
            });
        });
    });
});