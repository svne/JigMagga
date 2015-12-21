/*global describe, it, before, beforeEach: true*/

'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');

var archive = rewire('../../../lib/archiver');

describe('archiver', function () {
    describe('#bulkArchive', function () {

        // sinon removes '/' at the beginning !!!
        var fileList = [
            {content: 'foo', url:'foo/foo.txt', data: Date.now()},
            {content: 'bar', url:'bar/bar.txt', data: Date.now()},
            {content: 'qaz', url:'qaz/qaz.txt', data: Date.now()}
        ];

        var stream;

        before(function () {
            stream = archive.bulkArchive(fileList);
            sinon.spy(stream, 'append');
            sinon.spy(stream, 'finalize');
        });


        it('should add all files in the list to archive', function (done) {

            stream.on('finish', function () {

                expect(stream.append.callCount).to.eql(3);

                var firstAppendCall = stream.append.getCall(0);

                expect(firstAppendCall.args[0].toString()).to.eql(fileList[0].content);

                expect(firstAppendCall.args[0].toString()).to.eql(fileList[0].content);

                // sinon removes '/' at the beginning !!!
                expect(firstAppendCall.args[1]).to.have.property('name', fileList[0].url);

                expect(firstAppendCall.args[1]);

                expect(stream.finalize.called).to.eql(true);

                done();
            });

        });


    });
});