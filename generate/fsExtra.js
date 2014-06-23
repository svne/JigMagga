'use strict';

var walk = require('walk'),
    path = require('path'),
    _ = require('lodash'),
    async = require('async'),
    fs = require('fs'),
    ejs = require('ejs'),
    transform = require('stream-transform');


/**
 * create folder if it doesn't exist
 *
 * @param {string} path
 * @param {function} callback
 */
var createFolderIfNotExists = exports.createFolderIfNotExists = function (path, callback) {
    fs.mkdir(path, function (err) {
        if (err && err.code !== 'EEXIST') {
            return callback(err);
        }
        callback(null);
    });
};


var replacePlaceholders = function (stringWithPlaceholders, params) {
    var regexp = new RegExp('\\(([^)]+)\\)', 'ig'),
        placeholders;

    placeholders = stringWithPlaceholders.match(regexp);

    if (!placeholders) {
        return stringWithPlaceholders;
    }

    placeholders.forEach(function (placeholder) {
        var key = placeholder.replace('(', '').replace(')', ''),
            replaceRegexp;


        if (params[key]) {
            replaceRegexp = new RegExp('\\(' + key + '\\)', 'g');
            stringWithPlaceholders = stringWithPlaceholders.replace(replaceRegexp, params[key]);
        }
    });

    return stringWithPlaceholders;
};


var copyFiles = function (files, source, destination, options, callback) {

    async.each(files, function (file, next) {
        var sourceStream = fs.createReadStream(file),
            destinationStream;

        if (options.rename) {
            file = options.rename(file);
        }

        file = file.replace(source, destination);

        destinationStream = fs.createWriteStream(file);

        if (options.transform) {
            sourceStream.pipe(transform(options.transform)).pipe(destinationStream);
        } else {
            sourceStream.pipe(destinationStream);
        }

        destinationStream.on('finish', function () {
            next();
        });

        destinationStream.on('error', function (err) {
            next(err);
        });
    }, callback);
};

var createFolderStructure = function (directories, source, destination, options, callback) {
    async.eachSeries(directories, function (directoryPath, next) {
        if (options.rename) {
            directoryPath = options.rename(directoryPath);
        }
        directoryPath = directoryPath.replace(source, destination);
        createFolderIfNotExists(directoryPath, next);
    }, callback);
};

var copy = function (source, destination, options, callback) {
    var directories = [],
        files = [],
        addStatsToList,
        walker;

    walker = walk.walk(source);

    addStatsToList = function (list, root, stats) {
        stats = _.isArray(stats) ? stats : [stats];
        var result = stats.map(function (stat) {
            return root + '/' + stat.name;
        });

        return list.concat(result);
    };

    walker.on('directories', function (root, stats, next) {
        directories = addStatsToList(directories, root, stats);
        next();
    });

    walker.on('file', function (root, stats, next) {
        files = addStatsToList(files, root, stats);
        next();
    });

    walker.on('end', function () {
        async.series([
            function (next) {
                createFolderStructure(directories, source, destination, options, next);
            },
            function (next) {
                copyFiles(files, source, destination, options, next);
            }
        ], callback);

    });

};


exports.copy = function (source, destination, parameters, callback) {
    copy(source, destination, {
        rename: function (target) {
            target = target.replace(/\.ejs$/, '');
            return replacePlaceholders(target, parameters);
        },
        transform: function (data) {
            return ejs.render(data.toString('utf-8'), parameters);
        }

    }, callback);
};


var editFile = exports.editFile = function (filePath, edit, callback) {
    async.waterfall([
        fs.readFile.bind(fs, filePath),
        function (data, next) {
            data = edit(data.toString('utf-8'));

            fs.writeFile(filePath, data, next);
        }
    ], callback);
};

exports.editConfigFile = function (filePath, edit, callback) {
    editFile(filePath, function (data) {
        data = JSON.parse(data);
        data = edit(data);
        return JSON.stringify(data, null, '    ');
    }, callback);
};


exports.createPath = function (rootPath, pathToCreate, callback) {
    var folderList = pathToCreate.split('/'),
        currentPagePath = rootPath;

    async.eachSeries(folderList, function (folder, next) {
        currentPagePath = path.join(currentPagePath, folder);
        createFolderIfNotExists(currentPagePath, next);
    }, callback);
};
