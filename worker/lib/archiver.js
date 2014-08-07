'use strict';

var archiver = require('archiver');

module.exports = {
    bulkArchive: function (fileList) {
        var archive = archiver('zip');
        var fileListLength = fileList.length;
        for (var i = 0; i < fileListLength; i++) {
            archive.append(new Buffer(fileList[i].content), {name: fileList[i].url});
        }
        archive.finalize();

        return archive;
    }
};
