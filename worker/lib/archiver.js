'use strict';

var archiver = require('archiver');
var async = require('async');
var format = require('util').format;

/**
 *
 * @param {Array.<UploadItem>} uploadList
 * @return {Number}
 */
var calculateUploadSize = function (uploadList) {
    return uploadList.reduce(function (currentSum, nextItem) {
        return currentSum + nextItem.content.length;
    }, 0);
};

/** @define {Number} max size of uncompressed upload - 49mb */
var MAX_UNCOMPRESSED_UPLOAD_SIZE = 49 * 1000000;

module.exports = {
    /**
     * return a stream with zip archive of file from file list
     *
     * @param  {Array.<UploadItem>} fileList
     * @param  {Boolean} compress
     * @return {Readable}
     */
    bulkArchive: function (fileList) {
        var fileListLength = fileList.length;

        var uncompressedUploadSize = calculateUploadSize(fileList);

        var options = (uncompressedUploadSize > MAX_UNCOMPRESSED_UPLOAD_SIZE) ? {zlib: {level: 1}} : {store: true};

        var archive = archiver('zip', options);

        // this function is in async mode in oder to do a archive#apend it timeOut for cleaning call stuck
        async.eachSeries(fileList, function (item, next) {
            var date = item.time ? new Date(item.time) : new Date();

            if (typeof item.content !== 'string') {
                throw new Error(format('Content for url: %s missing should be string but %s', item.url, item.content));
            }

            setTimeout(function () {
                archive.append(new Buffer(item.content), {
                    name: item.url,
                    date: date
                });
                next();
            });

        }, function () {
            archive.finalize();
        });

        return archive;
    }
};
