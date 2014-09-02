'use strict';


var path = require("path"),
    es = require('event-stream'),
    extend = require('node.extend'),
    Uploader = require('jmUtil').ydUploader,
    configMerger = require('./configMerger'),
    fs = require('fs-extra');


var uploaderInstance;

/**
 * return an instance of uploader
 *
 * @param {object} config
 * @param {string} domain
 * @param {boolean} isLive
 * @return {Uploader}
 */
var getUploader = function (config, domain, isLive) {
    var env = isLive ? 'live': 'stage';

    if (uploaderInstance) {
        return uploaderInstance;
    }

    var knoxOptions = config.main.knox;

    if (!knoxOptions.S3_BUCKET) {
        var predefinedDomain = knoxOptions.buckets[env][domain];

        if (!predefinedDomain) {
            knoxOptions.S3_BUCKET = (isLive ? 'www' : 'stage') + '.' + domain;
        } else {
            knoxOptions.S3_BUCKET = predefinedDomain;
        }
    }

    uploaderInstance = new Uploader(knoxOptions);
    return uploaderInstance;
};

module.exports = {

    /**
     * prepare a build stream which include all informations about the build
     * @param program
     * @returns {*}
     */
    createStreamWithSettings: function (program) {
        var self = this;
        return es.readable(function (count, callback) {
            var options = {};
            options.namespace = program.namespace || "yd";
            options.namespacePath = path.normalize(__dirname + "/../../" + options.namespace);
            options.jigMaggaPath = path.normalize(__dirname + "/../..");
            options.basePath = self.getBasePath(options.namespace, program.basepath);
            options.defaultPath = options.basePath + "/default";
            options.domain = program.basedomain;
            options.jsgenerate = program.jsgenerate || program.jsgenerate === undefined ? true : false;
            options.cssgenerate = program.cssgenerate || program.cssgenerate === undefined ? true : false;
            options.minify = program.minify || program.minify === undefined ? true : false;
            options.page = program.page;
            options.versionnumber = program.versionnumber;
            options.live = program.live;
            options.upload = program.upload;
            if (!options.domain) {
                throw new Error("no domain");
            }
            if (!options.page) {
                throw new Error("no page");
            }
            var data = {
                build: options
            };
            this.emit('data', data);
            this.emit('end');
            callback();
        });
    },
    /**
     *
     * @param namespace
     * @param basepath
     * @returns {string}
     */
    getBasePath: function (namespace, basepath) {
        namespace = namespace || "yd";
        basepath = basepath || "page";
        var basePath = path.normalize(__dirname + "/../../" + namespace + "/" + basepath);
        if (!fs.existsSync(basePath)) {
            throw new Error("Basepath not exists: " + basePath);
        }
        return basePath;
    },
    /**
     * get a real file from path use also default
     * @param path
     * @param fileextension
     * @returns {*}
     */
    getFileFromPath: function (path, fileextension) {
        fileextension = fileextension || "js";
        path = path || "";
        return path.replace(/\/([^/]*)$/, "/$1/$1." + fileextension);
    },
    /**
     *
     * @param namespace
     * @returns {*}
     */
    setNameSpacePath: function (namespace) {
        namespace = namespace || "yd";
        return es.map(function (data, callback) {
            data.build = data.build || {};
            data.build.namespacePath = path.normalize(__dirname + "/../../" + namespace);
            callback(null, data);
        });
    },
    /**
     *
     * @param path
     * @param root
     * @returns {*}
     */
    getRelativePathFromStealRootPath: function (path, root) {
        return path.replace(root, "").replace(/^\//, "");
    },
    /**
     * split all pages that are in the stream array in single streams and parse them into the flow
     * @returns {*}
     */
    splitPagesIntoSingleStreams: function () {
        return es.through(function write(data) {
            for (var i = 0; i < data.length; i++) {
                var dataCopy = extend(true, {}, data[i]);
                this.emit('data', dataCopy);
            }
        });

    },
    /**
     * join all pages to one single array stream
     * @returns {*}
     */
    joinPagesIntoSingleStreams: function () {
        var arry = [];
        return es.through(function (data) {
                arry.push(data);
            },
            function () {
                this.emit('data', arry);
                this.emit('end');
            });
    },
    /**
     * dublicat one page object into many browser and locales
     * need a stream with a single page object
     * @returns {*}
     */
    duplicatePagesForLocalesAndBrowsers: function () {
        return es.through(function write(data) {
            data.locales = data.locales || [];
            data.browsers = data.browsers || [];
            for (var i = 0; i < data.locales.length; i++) {
                for (var y = -1; y < data.browsers.length; y++) {
                    data.build.browser = data.browsers[y] || null;
                    data.build.locale = data.locales[i];
                    this.emit('data', extend(true, {}, data));
                }
            }
        });
    },
    /**
     *
     * @returns {*}
     */
    bufferAllPagesAndWaitingForDoneEvent: function () {
        var selfHelper = this,
            buffer = [];
        return es.through(function write(data) {
                buffer.push(data);
            },
            function end() { //optional
                var self = this;
                var timer = setInterval(function () {
                    if (buffer.length && !selfHelper.inProgress) {
                        selfHelper.inProgress = true;
                        self.emit('data', buffer.pop());
                    } else if (!buffer.length) {
                        clearInterval(timer);
                        self.emit('end');
                    }
                }, 100);
            }
        );
    },
    triggerDonePageEvent: function () {
        var selfHelper = this;
        return es.map(function (data, callback) {
            console.log("DONE : ", data.build.page);
            selfHelper.inProgress = false;
            callback(null, data);
        });
    },
    loadFileFromStealOptions: function (options) {
        var src = typeof options.src === "string" ? options.src : options.src.path;
        return fs.readFileSync(src, {
            encoding: "utf8"
        });
    },


    /**
     * upload content to cdn
     *
     * @param {string} fileContent
     * @param {string} uploadPath
     * @param {string} extension
     * @param {{namespace: string, domain: string, live: boolean, jsgenerate: boolean}} buildOptions
     */
    uploadContent: function (fileContent, uploadPath, extension, buildOptions) {
        var config = configMerger.getProjectConfig(buildOptions.namespace);
        var uploader = getUploader(config, buildOptions.domain, buildOptions.live);

        var contentType = extension === 'js' ? 'application/javascript' : 'text/css';

        uploadPath += '.' + extension;

        uploader.uploadContent(fileContent, uploadPath, {type: contentType}, function (err, res) {
            if (err) {
                return process.stdout.write(err);
            }
            return process.stdout.write(res + '\n');
        });
    },

    saveFileToDiskOrUpload: function () {
        var that = this;
        return es.map(function (data, callback) {
            var fullPath,
                fileContent,
                browser,
                uploadPath,
                pathToDomain,
                name;
            data.forEach(function (item) {
                browser = item.build.browser ? Object.keys(item.build.browser).filter(function (a) {
                    return a !== "version";
                }).join() + item.build.browser.version : null;
                name = [];
                browser && name.push(browser);
                item.build.locale && name.push(item.build.locale);
                item.build.versionnumber && name.push(item.build.versionnumber);
                fullPath = item.build.pageHTMLPath.replace(/[^/]*$/, "") + "production-" + name.join("-");
                if (!item.build.upload) {
                    if(item.build.jsgenerate) {
                        fs.outputFileSync(fullPath + ".js", item.build.package.js);
                    }
                    if(item.build.cssgenerate) {
                        fs.outputFileSync(fullPath + ".css", item.build.package.css);
                    }
                    process.stdout.write("Save Files to: " + fullPath + "\n");
                }

                uploadPath = fullPath.replace(item.build.jigMaggaPath + '/', '');
                process.stdout.write("Starting upload to: " + uploadPath + "\n");

                if(item.build.jsgenerate) {
                    that.uploadContent(item.build.package.js, uploadPath, 'js', item.build);
                }
                if(item.build.cssgenerate) {
                    that.uploadContent(item.build.package.css, uploadPath, 'css', item.build);
                }
            });
            callback(null, data);
        });
    },
    stdoutSingleObjectWithBumper: function () {
        return es.map(function (data, callback) {
            if (typeof data !== "string") {
                data = JSON.stringify(data);
            }
            process.stdout.write("\n-||JSON||-\n");
            process.stdout.write(data);
            process.stdout.write("\n-||JSON||-\n");
            callback(null, data);
        });
    },
    bufferStringifyStreamWithBumperAndParseSingleObject: function () {
        var buffer = [],
            split,
            join;
        return es.through(function write(data) {
            split = data.split("\n-||JSON||-\n");
            if (split.length > 1) {
                for (var i = 0; i < split.length; i++) {
                    buffer.push(split[i]);
                    if (i !== (split.length - 1)) {
                        join = buffer.join("");
                        buffer = [];
                        if (join.length) {
                            var a = JSON.parse(join);
                            this.emit("data", a);
                        }
                    }
                }
            } else {
                buffer.push(split.join(""));
            }

        });
    }
};