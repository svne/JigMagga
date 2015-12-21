/*global describe, it, beforeEach, afterEach, before, after: true*/

'use strict';
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');
var es = require('event-stream');
var _ = require('lodash');
var messageHelper = rewire('../../../lib/message');
var message = rewire('../../../testData/message.json');

var hl = require('highland');

describe('message', function () {

    describe('#extendMessage', function () {

        var messageData = {
            basedomain: 'foo',
            page: 'menu',
            url: 'foo-bar.com'
        };

        it('message url and page overwrite them from options', function () {
            var options = {
                page: 'page',
                url: 'url.com'
            };

            var result = messageHelper.extendMessage(messageData, options);

            expect(result).to.have.property('page').and.equal(messageData.page);
            expect(result).to.have.property('page').not.and.equal(options.page);
        });

        it('should use params from message if options.values was not provided', function () {
            var options = {};
            messageData.cityId = 234;

            var result = messageHelper.extendMessage(messageData, options);

            expect(result.params).to.have.property('cityId', 234);

        });
    });


    describe('#assignMessageMethods', function () {

        var stream;

        beforeEach(function () {
            stream = messageHelper.assignMessageMethods();
        });

        afterEach(function () {
            stream.end();
        });

        it('each rabbit message should get two new methods assigned', function (done) {

            var msg = {
                properties : {contentType: 'text/plain'},
                content: new Buffer(JSON.stringify({foo: 1}))
            };

            stream.on('data', function (res) {
                expect(_.size(res)).to.eql(4);
                expect(res).have.property('onDone').and.to.be.an('function');
                expect(res).have.property('queueShift').and.to.be.an('function');
                done();
            });
            stream.write(msg);
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

        /**
         * Replacement for the hl.toArray which doesn't work properly.
         */
        var toArray;

        beforeEach(function () {
            toArray = function (toCount) {

                var array = [];
                var counter = 0;

                return function (err, data, push, next) {

                    if (err) {
                        push(err);
                        next();
                    } else if (data === hl.nil) {
                        push(null, data);
                    } else {
                        counter++;
                        array.push(data);
                        if (counter >= toCount) {
                            push(null, array)
                        }
                        next();
                    }
                };
            };
        });


        it('should push message without splitting if it has url, page and locale', function (done) {

            var msg = {message: message, basePath: '/foo/bar/qaz', config: config};

            var stream = hl([msg])
                .pipe(hl.pipeline(messageHelper.pageLocaleSplitter()));

            stream.on('data', function (res) {
                expect(res.message).to.equal(msg.message);
                done();
            });

        });

        it('should push message for each locale in config if incoming message has url and page but not locale',
            function (done) {

                var msg = { basedomain: 'lieferservice.de',
                    page: 'foo',
                    url: 'salatmanufaktur-berlin',
                    restaurantId: 12413
                    // locale setting was removed
                };

                var stream = hl([{message: msg, config: config, basePath: '/foo/bar/qaz'}])
                    .pipe(hl.pipeline(
                        messageHelper.pageLocaleSplitter(),
                        hl.consume(toArray(_.size(config.pages.foo)))
                    ));

                stream.on('data', function (res) {

                    expect(res.length).to.equal(_.size(config.pages.foo));

                    res.forEach(function (elem, index) {
                        expect(config.pages.foo).to.have.property(res[index].message.locale);
                    });

                    done();
                });

            });

        it("if config doesn't have local so get it from message", function (done) {

            var page = 'bar';

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

            var myConfig = _.cloneDeep(config);

            myConfig.pages[page] = {};  // no locale is defined in the config file

            // message doesn't have local, but the config does
            var msg = {
                basedomain: 'lieferservice.de',
                page: page,
                url: 'salatmanufaktur-berlin',
                restaurantId: 12413,
                "locale": "de_DE"
            };

            var stream = hl([{message: msg, config: myConfig, basePath: '/foo/bar/qaz'}])
                .pipe(hl.pipeline(
                    messageHelper.pageLocaleSplitter(),
                    hl.consume(toArray(_.size(config.pages.bar)))
                ));

            stream.on('data', function (res) {

                expect(res).to.have.length(1);

                expect(res[0].message.page).to.equal(page);

                expect(res[0].message.locale).to.equal(msg.locale);

                done();
            });

        });

        it('should push a message for each page in config if there is no page and url in incoming message',
            function (done) {

                // page and url don't exist in the message, but in the config does
                var msg = {
                    basedomain: 'lieferservice.de',
                    //page: page,
                    //url: 'salatmanufaktur-berlin',
                    restaurantId: 12413,
                    "locale": "de_DE"
                };

                var stream = hl([{message: msg, config: config, basePath: '/foo/bar/qaz'}])
                    .pipe(hl.pipeline(
                        messageHelper.pageLocaleSplitter(),
                        hl.consume(toArray(_.size(config.pages)))
                    ));

                stream.on('data', function (res) {

                    expect(res.length).to.equal(_.size(config.pages));

                    res.forEach(function (elem) {
                        expect(config.pages).to.have.property(elem.message.page);
                    });

                    done();
                });
            });

        it('should push all pages from all locales in config if there is no page, url and locale in msg', function (done) {

            // page, url and locale don't exist in the message, but in the config does
            var msg = {
                basedomain: 'lieferservice.de',
                //page: page,
                //url: 'salatmanufaktur-berlin',
                restaurantId: 12413
                //"locale": "de_DE"
            };

            var stream = hl([{message: msg, config: config, basePath: '/foo/bar/qaz'}])
                .pipe(hl.pipeline(
                    messageHelper.pageLocaleSplitter(),
                    hl.consume(toArray(3))
                ));

            stream.on('data', function (res) {

                var pages = res.reduce(function (prev, next) {
                    var combined = next.message.page + '-' + next.message.locale;
                    if (!prev[combined]) {
                        prev[combined] = 1;
                    } else {
                        prev[combined]++;
                    }
                    return prev;
                }, {});

                // all of all 3 pages
                expect(res.length).to.eql(3);

                expect(pages['foo-de_DE']).to.eql(1);
                expect(pages['foo-en_EN']).to.eql(1);
                expect(pages['bar-de_DE']).to.eql(1);

                done();
            });
        });

    });

    describe('#storage', function () {

        afterEach(function () {
            messageHelper.__set__('messageStorage', {});
        });

        describe('#add', function () {
            it('should increase count of done and upload if it has the same key in storage', function () {
                var data = {
                    key: 'foo'
                };

                messageHelper.storage.add(data.key);
                messageHelper.storage.add(data.key);
                var messageStorage = messageHelper.__get__('messageStorage');
                expect(messageStorage[data.key]).to.be.an('object');

                expect(messageStorage[data.key].doneCount).to.eql(2);
                expect(messageStorage[data.key].uploadCount).to.eql(2);
            });
        });

        describe('#done #upload', function () {
            it('should reduce the count and do not execute onDone function if done count more then 0', function () {
                var data = {
                    key: 'foo'
                };
                var onDone = sinon.spy();
                var onUpload = sinon.spy();

                messageHelper.storage.add(data.key, onDone, onUpload);
                messageHelper.storage.add(data.key, onDone, onUpload);
                messageHelper.storage.add(data.key, onDone, onUpload);

                messageHelper.storage.done(data.key);
                messageHelper.storage.upload(data.key);
                messageHelper.storage.upload(data.key);

                var messageStorage = messageHelper.__get__('messageStorage');
                expect(messageStorage[data.key]).to.be.an('object');

                expect(messageStorage[data.key].doneCount).to.eql(2);
                expect(messageStorage[data.key].uploadCount).to.eql(1);
                expect(onDone.called).to.not.eql(true);
                expect(onUpload.called).to.not.eql(true);
            });

            it('should reduce the count and execute function if it count  eql 0', function () {
                var data = {
                    key: 'foo'
                };

                var onDone = sinon.spy();
                var onUpload = sinon.spy();

                messageHelper.storage.add(data.key, onDone, onUpload);
                messageHelper.storage.add(data.key, onDone, onUpload);

                messageHelper.storage.done(data.key);
                messageHelper.storage.done(data.key);
                messageHelper.storage.upload(data.key);
                messageHelper.storage.upload(data.key);

                var messageStorage = messageHelper.__get__('messageStorage');

                expect(typeof messageStorage[data.key]).to.eql('undefined');

                expect(onDone.calledOnce).to.eql(true);
                expect(onUpload.calledOnce).to.eql(true);
            });
        });
    });
});


