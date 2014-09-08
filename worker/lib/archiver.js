'use strict';

var archiver = require('archiver');

module.exports = {
    /**
     * return a stream with zip archive of file from file list
     * 
     * @param  {array} fileList  [list of objects {content: string, url: string, time: timestamp}]
     * @return {stream}
     */
    bulkArchive: function (fileList) {
        var archive = archiver('zip');
        var fileListLength = fileList.length;

        for (var i = 0; i < fileListLength; i++) {

            var date = fileList[i].time ? new Date(fileList[i].time) : new Date();

            archive.append(new Buffer(fileList[i].content), {
                name: fileList[i].url,
                date: date
            });
        }
        archive.finalize();

        return archive;
    }
};
