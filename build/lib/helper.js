var path = require("path"),
    util = require("util"),
    es = require('event-stream'),
    extend = require('node.extend'),
    fs = require('fs');
module.exports = {

    /**
     * prepare a build stream which include all informations about the build
     * @param program
     * @returns {*}
     */
    createStreamWithSettings: function (program) {
        var self = this;
        return es.readable(function (count, callback) {
            program.namespace = program.namespace || "yd";
            program.namespacePath = path.normalize(__dirname + "/../../" + program.namespace);
            program.jigMaggaPath = path.normalize(__dirname + "/../..");
            program.basePath = self.getBasePath(program.basepath);
            program.defaultPath = program.basePath + "/default";
            program.domain = program.basedomain;
            program.minify = program.minify === 0 || program.minify === 1 ? program.minify : true;
            if (!program.domain) {
                throw new Error("no domain");
            }
            if (!program.page) {
                throw new Error("no page");
            }
            var data = {
                build: program
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
        return  path.normalize(__dirname + "/../../" + namespace + "/" + basepath);
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
        })
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
        })

    },
    /**
     * join all pages to one single array stream
     * @returns {*}
     */
    joinPagesIntoSingleStreams: function () {
        var arry = [];
        return es.through(function (data) {
                arry.push(data)
            },
            function () {
                this.emit('data', arry);
                this.emit('end')
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
                for (var y = 0; y < data.browsers.length; y++) {
                    data.build.browser = data.browsers[y];
                    data.build.locale = data.locales[i];
                    this.emit('data', extend(true, {}, data));
                }
            }
        })
    },
    /**
     *
     * @returns {*}
     */
    bufferAllPagesAndWaitingForDoneEvent: function () {
        var selfHelper = this,
            buffer = [];
        return es.through(function write(data) {
                buffer.push(data)
            },
            function end() { //optional
                var self = this;
                var timer = setInterval(function () {
                    if (buffer.length && !selfHelper.inProgress) {
                        selfHelper.inProgress = true;
                        self.emit('data', buffer.pop())
                    } else if (!buffer.length) {
                        clearInterval(timer);
                        self.emit('end');
                    }
                }, 100)
            }
        );
    },
    triggerDonePageEvent: function () {
        var selfHelper = this;
        return es.map(function (data, callback) {
            console.log("DONE : ", data.build.page);
            selfHelper.inProgress = false;
            callback(null, data);
        })
    },
    loadFileFromStealOptions: function (options) {
        var src = typeof options.src === "string" ? options.src : options.src.path;
        return fs.readFileSync(src, {
            encoding: "utf8"
        });
    }




};