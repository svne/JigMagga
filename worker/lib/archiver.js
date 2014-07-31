'use strict';

var archiver = require('archiver');

module.exports = {
    bulkArchive: function (fileList) {
        var archive = archiver('zip');

        fileList.forEach(function (item) {
            archive.append(new Buffer(item.content), {name: item.url});
        });
        fileList = [];
        archive.finalize();

        return archive;
    }
};
