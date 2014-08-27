steal("steal/instrument", "jquery").then("qunit", "qunit-tap", function () {

    QUnit.config.autostart = false;

    QUnit.config.urlConfig.push({
        id: "coverage",
        label: "Show code coverage",
        tooltip: "Execute steal instrument and show the result."
    });

}).then("funcunit", function () {


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


    if (window.navigator.userAgent.indexOf("PhantomJS") !== -1) {
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
            // Run tests serially, not in parallel.
            QUnit.config.autorun = false;

            // Send messages to the parent PhantomJS process via alert! Good times!!
            function sendMessage() {
                var args = [].slice.call(arguments);
                alert(JSON.stringify(args));
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
                sendMessage('qunit.log', obj.result, actual, expected, obj.message, obj.source);
            });

            QUnit.testStart(function (obj) {
                sendMessage('qunit.testStart', obj.name);
            });

            QUnit.testDone(function (obj) {
                sendMessage('qunit.testDone', obj.name, obj.failed, obj.passed, obj.total);
            });

            QUnit.moduleStart(function (obj) {
                sendMessage('qunit.moduleStart', obj.name);
            });

            QUnit.moduleDone(function (obj) {
                sendMessage('qunit.moduleDone', obj.name, obj.failed, obj.passed, obj.total);
            });

            QUnit.begin(function () {
                sendMessage('qunit.begin');
            });

            QUnit.done(function (obj) {
                //filterInstrumentFiles();
                sendMessage('qunit.instrument', filterInstrumentFiles(steal.instrument.compileStats()));
                sendMessage('qunit.done', obj.failed, obj.passed, obj.total, obj.runtime);
            });

            qunitTap(QUnit, function (msg) {
                sendMessage('qunit.tap', msg);
            });

        }());
    }



    steal.one("end", function(){
        QUnit.load();
        QUnit.start();
    });

});



