/*global describe, it, beforeEach, afterEach, before, after: true*/

'use strict';
var expect = require('chai').expect;
var es = require('event-stream');
var _ = require('lodash');
var messageHelper = require('../../lib/message');


describe('message', function () {

    describe('#createMessage', function () {
        var messageData = {
            basedomain: 'foo',
            page: 'menu',
            url: 'foo-bar.com'
        };

        it('should use options.values as the params key', function () {
            var options = {
                values: {
                    cityId: 123,
                    q: 'q',
                    exc: 'exc'
                }
            };

            var result = messageHelper.createMessage(messageData, options);

            expect(result.params).to.include.keys('cityId', 'q', 'exc');
        });

        it('should use params from message if options.values was not provided', function () {
            var options = {};
            messageData.cityId = 234;

            var result = messageHelper.createMessage(messageData, options);

            expect(result.params).to.have.property('cityId', 234);

        });
    });


    describe('#getMessageParser', function () {
        var stream;
        beforeEach(function () {
            stream = messageHelper.getMessageParser();
        });

        afterEach(function () {
            stream.end();
        });

        it('should parse message if the content type is text/plain', function (done) {
            //data.properties.contentType
            var message = {
                properties : {contentType: 'text/plain'},
                content: new Buffer(JSON.stringify({foo: 1}))
            };

            stream.on('data', function (res) {
                expect(res.message).to.eql(JSON.parse(message.content));
                done();
            });
            stream.write(message);
        });

        it('should not parse message if content type is text/json', function (done) {
            var message = {
                properties : {contentType: 'text/json'},
                content: {foo: 1}
            };

            stream.on('data', function (res) {
                expect(res.message).to.eql(message.content);
                done();
            });
            stream.write(message);

        });
    });


    describe('#pageLocaleSplitter', function () {
        var config = {
            pages: {
                foo: {
                    'de_DE': '/bar',
                    'en_EN': '/en/bar'
                },
                bar: {
                    'de_DE': '/foo'
                }
            },
            locales:['de_DE', 'en_EN']
        };

        it('should push message without splitting if it has url, page and locale', function (done) {
            var msg = {message: {url: 'foo', page: 'bar', locale: 'de_DE'}};

            es.readArray([msg])
                .pipe(messageHelper.pageLocaleSplitter())
                .pipe(es.writeArray(function (err, res) {
                    expect(err).to.eql(null);
                    expect(res).to.have.length(1);
                    expect(res[0]).to.eql(msg);
                    done();
                }));
        });

        it('should push message for each locale in config if incoming message has url and page but not locale',
            function (done) {
                var msg = {url: 'foo', page: 'foo'};
                es.readArray([{message: msg, config: config}])
                    .pipe(messageHelper.pageLocaleSplitter())
                    .pipe(es.writeArray(function (err, res) {
                        expect(err).to.eql(null);
                        expect(res).to.have.length(2);
                        expect(res[0].message).to.eql({url: 'foo', page: 'foo', locale: 'de_DE'});
                        expect(res[1].message).to.eql({url: 'foo', page: 'foo', locale: 'en_EN'});
                        done();
                    }));
            });

        it('should push out only one message if page in config doesnt have current locale', function (done) {
            var list = [
                {
                    message: {url: 'foo', page: 'bar'},
                    config: config
                }
            ];
            es.readArray(list)
                .pipe(messageHelper.pageLocaleSplitter())
                .pipe(es.writeArray(function (err, res) {
                    expect(err).to.eql(null);
                    expect(res).to.have.length(1);

                    expect(_.find(res, {message: {page: 'bar', locale: 'de_DE'}})).to.not.eql(undefined);
                    expect(_.find(res, {message: {page: 'bar', locale: 'en_EN'}})).to.eql(undefined);
                    done();
                }));
        });

        it('should push a message for each page in config if there is no page and url in incomeing message',
            function (done) {
                var list = [
                    {
                        message: {locale: 'en_EN'},
                        config: config
                    }

                ];
                es.readArray(list)
                    .pipe(messageHelper.pageLocaleSplitter())
                    .pipe(es.writeArray(function (err, res) {
                        expect(err).to.eql(null);
                        expect(res).to.have.length(1);

                        expect(_.find(res, {message: {page: 'foo', locale: 'en_EN'}})).to.not.eql(undefined);
                        done();
                    }));
            });

        it('should push all pages fro all locales in config if there is no page, url and locale in msg', function (done) {
            var list = [
                {
                    message: {restaurantId: 1235},
                    config: config
                }

            ];
            es.readArray(list)
                .pipe(messageHelper.pageLocaleSplitter())
                .pipe(es.writeArray(function (err, res) {
                    expect(err).to.eql(null);
                    expect(res).to.have.length(3);

                    expect(_.find(res, {message: {page: 'foo', locale: 'en_EN'}})).to.not.eql(undefined);
                    expect(_.find(res, {message: {page: 'foo', locale: 'de_DE'}})).to.not.eql(undefined);
                    expect(_.find(res, {message: {page: 'bar', locale: 'de_DE'}})).to.not.eql(undefined);
                    done();
                }));
        });

    });
});
