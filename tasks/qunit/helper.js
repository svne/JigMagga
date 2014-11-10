var fs = require("fs");

module.exports = {


    codeCoverageReport: function (instrumentLog, path) {
        var stats = {
            files: {},
            total: {}
        };
        for (var i = 0; i < instrumentLog.length; i++) {
            for (var file in instrumentLog[i].files) {
                if (stats.files[file]) {
                    stats.files[file].blockCoverage = (stats.files[file].blockCoverage + instrumentLog[i].files[file].blockCoverage) / 2;
                    stats.files[file].lineCoverage = (stats.files[file].lineCoverage + instrumentLog[i].files[file].lineCoverage) / 2;
                    for (var line in stats.files[file].linesUsed) {
                        if (stats.files[file].linesUsed[line] === 0 && instrumentLog[i].files[file].linesUsed[line] === 1) {
                            stats.files[file].linesUsed[line] = 1;
                        }
                    }
                } else {
                    stats.files[file] = instrumentLog[i].files[file];
                }
            }
        }
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
        fs.writeFileSync(path || "code-coverage-report.html", fs.readFileSync(__dirname + "/qunit/code-coverage-template.html", {encoding: "utf8"}).replace("/*---COVERAGE_RESULT---*/", JSON.stringify(stats)))
    },


    tapReport: function (tapLog, path) {
        fs.writeFileSync(path || "tap.log", tapLog.join("\n"));
    },

    getTapLogFromQunitResult: function (result) {
        var log = [];
        for (var key in result) {
            if (result[key].length && result[key][0] === "qunit.tap") {
                for (var i = 1, len = result[key].length; i < len; i++) {
                    log.push(result[key][i]);
                }
            }
        }
        return log;
    }



};