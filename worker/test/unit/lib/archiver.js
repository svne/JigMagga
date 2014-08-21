/*global describe, it, before, beforeEach: true*/

'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');

var archive = rewire('../../../lib/archiver');

describe('archiver', function () {
    describe('#bulkArchive', function () {
        var archiveStub = {};
        var archiverStub;
        beforeEach(function () {
            archiveStub.append = sinon.spy();
            archiveStub.finalize = sinon.spy();

            archiverStub =function () {
                return archiveStub;
            };
            archive.__set__('archiver', archiverStub);
        });

        var fileList = [
            {content: 'foo', url:'/foo/foo.txt', data: Date.now()},
            {content: 'bar', url:'/bar/bar.txt', data: Date.now()},
            {content: 'qaz', url:'/qaz/qaz.txt', data: Date.now()}
        ];

        it('should add all files in the list to archive', function () {
            archive.bulkArchive(fileList);
            expect(archiveStub.append.callCount).to.eql(3);
            var firstAppendCall = archiveStub.append.getCall(0);

            expect(firstAppendCall.args[0].toString()).to.eql(fileList[0].content);
            expect(firstAppendCall.args[1]).to.have.property('name', fileList[0].url);
            
            expect(archiveStub.finalize.called).to.eql(true);
        });


    });
});