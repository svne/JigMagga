'use strict';

var archiver = require('archiver');
var async = require('async');
var format = require('util').format;

module.exports = {
    /**
     * return a stream with zip archive of file from file list
     *
     * @param  {Array.<UploadItem>} fileList
     * @param  {Boolean} compress
     * @return {Readable}
     */
    bulkArchive: function (fileList, compress) {
        var fileListLength = fileList.length;

        var options = (fileListLength > 200 || compress) ? {zlib: {level: 1}} : {store: true};

        var archive = archiver('zip', options);

        for (var i = 0; i < fileListLength; i++) {

            var date = fileList[i].time ? new Date(fileList[i].time) : new Date();

            if (typeof fileList[i].content !== 'string') {
                throw new Error(format('Content for url: %s missing should be string but %s', fileList[i].url, fileList[i].content));
            }

            archive.append(new Buffer(fileList[i].content), {
                name: fileList[i].url,
                date: date
            });
        }
        archive.finalize();

        return archive;
    }
};
