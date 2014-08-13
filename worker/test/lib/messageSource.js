/*global describe, it : true*/
'use strict';

var path = require('path');
var expect = require('chai').expect;

var messageSource = require('../../lib/messageSource');

describe('messageSource', function () {
    var log = function  () {};

    describe('#getStaticOldSource', function () {
        var basePath = path.join(__dirname, '../../../yd');
        it('return a stream with static old pages', function (done) {
            var program = {basedomain: 'lieferando.de'};

            var stream = messageSource.getStaticOldSource(program, log, basePath);

            stream.once('data', function (data) {
                expect(data).to.have.property('message');
                expect(data.message).to.be.an('object');
                expect(data.message).to.include.keys('basedomain', 'url', 'page', 'locale');
            });
            stream.on('end', function () {
                done();
            });

        });
    });
});