steal("jquery", "can/util", "qunit", "qunit-tap", "funcunit", function () {

    var QunitLoad = QUnit.load,
        ready = false;

    FuncUnit.timeout = 120000;


    QUnit.load = function () {
        if (ready) {
            QunitLoad();
        }
    };


    if (window.navigator.userAgent.indexOf("PhantomJS") !== -1) {
        // phantomjs has issues with to many logs
        can.dev.logLevel = 10;
        steal.dev.logLevel = 10;
    }


    if (steal.instrument) {
        QUnit.config.urlConfig.push({
            id: "coverage",
            label: "Show code coverage",
            tooltip: "Execute steal instrument and show the result."
        });
    }

    function filterInstrumentFiles(stats) {
        var startPath = steal.config("startId").replace(/\/[^\/]*$/, "");
        // filter files
        for (var i in stats.files) {
            if (i.indexOf(startPath) === -1) {
                delete stats.files[i];
            }
        }
        // calc total new
        delete stats.total;
        var totalLines = 0,
            totalLinesHit = 0,
            totalBlocks = 0,
            totalBlocksHit = 0;
        for (var fileName in stats.files) {
            totalLines += stats.files[fileName].lines;
            totalBlocks += stats.files[fileName].blocks;
            totalLinesHit += stats.files[fileName].lines * stats.files[fileName].lineCoverage;
            totalBlocksHit += stats.files[fileName].blocks * stats.files[fileName].blockCoverage;
        }
        var totalLineCoverage = 0,
            totalBlockCoverage = 0;

        if (totalLines) {
            totalLineCoverage = totalLinesHit / totalLines;
        }
        if (totalBlocks) {
            totalBlockCoverage = totalBlocksHit / totalBlocks;
        }

        var total = {
            lineCoverage: totalLineCoverage,
            blockCoverage: totalBlockCoverage,
            lines: totalLines,
            blocks: totalBlocks
        };
        stats.total = total;
        return stats;
    }


    QUnit.done(function (obj) {
        if ($("#qunit-urlconfig-coverage").prop("checked")) {
            steal.instrument.report(filterInstrumentFiles(steal.instrument.compileStats()));
        }
    });


    /*
     * grunt-contrib-qunit
     * http://gruntjs.com/
     *
     * Copyright (c) 2013 "Cowboy" Ben Alman, contributors
     * Licensed under the MIT license.
     */
    (function () {
        'use strict';

        // Don't re-order tests.
        QUnit.config.reorder = false;

        QUnit.config.autorun = false;

        QUnit.jigMagga = {
            eventQueue: [],
            done: false
        };

        // Send messages to the parent PhantomJS process via alert! Good times!!
        function sendMessage(event) {
            var args = [].slice.call(arguments);
            QUnit.jigMagga.eventQueue.push(args);
        }

        // These methods connect QUnit to PhantomJS.
        QUnit.log(function (obj) {
            // What is this I don’t even
            if (obj.message === '[object Object], undefined:undefined') {
                return;
            }
            // Parse some stuff before sending it.
            var actual = QUnit.jsDump.parse(obj.actual);
            var expected = QUnit.jsDump.parse(obj.expected);
            // Send it.
            sendMessage('qunit.log', obj, actual, expected);
        });

        QUnit.testStart(function (obj) {
            sendMessage('qunit.testStart', obj);
        });

        QUnit.testDone(function (obj) {
            sendMessage('qunit.testDone', obj);
        });

        QUnit.moduleStart(function (obj) {
            sendMessage('qunit.moduleStart', obj);
        });

        QUnit.moduleDone(function (obj) {
            sendMessage('qunit.moduleDone', obj);
        });

        QUnit.begin(function () {
            sendMessage('qunit.begin');
        });

        QUnit.done(function (obj) {
            //sendMessage('qunit.instrument', filterInstrumentFiles(steal.instrument.compileStats()));
            sendMessage('qunit.done', obj);
            QUnit.jigMagga.done = true;
        });

        qunitTap(QUnit, function (msg) {
            sendMessage('qunit.tap', msg);
        });

    }());


    steal.one("ready", function () {
        ready = true;
        QUnit.load();
    });

});



