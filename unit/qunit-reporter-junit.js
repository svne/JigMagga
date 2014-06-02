/**
 * JUnit reporter for QUnit v1.0.1
 *
 * https://github.com/jquery/qunit-reporter-junit
 *
 * Copyright 2013 jQuery Foundation and other contributors
 * Released under the MIT license.
 * https://jquery.org/license/
 */
//(function () {
//    'use strict';
//    var currentRun, currentModule, currentTest, assertCount;
//    // Gets called when a report is generated.
//    QUnit.jUnitReport = function (/* data */) {
//        // Override me!
//    };
//    QUnit.begin(function () {
//        currentRun = {
//            modules: [],
//            total: 0,
//            passed: 0,
//            failed: 0,
//            start: new Date(),
//            time: 0
//        };
//    });
//    QUnit.moduleStart(function (data) {
//        currentModule = {
//            name: data.name,
//            tests: [],
//            total: 0,
//            passed: 0,
//            failed: 0,
//            start: new Date(),
//            time: 0,
//            stdout: [],
//            stderr: []
//        };
//        currentRun.modules.push(currentModule);
//    });
//    QUnit.testStart(function (data) {
//        // Setup default module if no module was specified
//        if (!currentModule) {
//            currentModule = {
//                name: data.module || 'default',
//                tests: [],
//                total: 0,
//                passed: 0,
//                failed: 0,
//                start: new Date(),
//                time: 0,
//                stdout: [],
//                stderr: []
//            };
//            currentRun.modules.push(currentModule);
//        }
//        // Reset the assertion count
//        assertCount = 0;
//        currentTest = {
//            name: data.name,
//            failedAssertions: [],
//            total: 0,
//            passed: 0,
//            failed: 0,
//            start: new Date(),
//            time: 0
//        };
//        currentModule.tests.push(currentTest);
//    });
//    QUnit.log(function (data) {
//        assertCount++;
//        // Ignore passing assertions
//        if (!data.result) {
//            currentTest.failedAssertions.push(data);
//            // Add log message of failure to make it easier to find in Jenkins CI
//            currentModule.stdout.push('[' + currentModule.name + ', ' + currentTest.name + ', ' + assertCount + '] ' + data.message);
//        }
//    });
//    QUnit.testDone(function (data) {
//        if (currentTest) {
//            currentTest.time = (new Date()).getTime() - currentTest.start.getTime();  // ms
//            currentTest.total = data.total;
//            currentTest.passed = data.passed;
//            currentTest.failed = data.failed;
//            currentTest = null;
//        }
//    });
//    QUnit.moduleDone(function (data) {
//        if (currentModule) {
//            currentModule.time = (new Date()).getTime() - currentModule.start.getTime();  // ms
//            currentModule.total = data.total;
//            currentModule.passed = data.passed;
//            currentModule.failed = data.failed;
//            currentModule = null;
//        }
//    });
//    QUnit.done(function (data) {
//        if (currentRun) {
//            currentRun.time = data.runtime || ((new Date()).getTime() - currentRun.start.getTime());  // ms
//            currentRun.total = data.total;
//            currentRun.passed = data.passed;
//            currentRun.failed = data.failed;
//            generateReport(data, currentRun);
//        }
//    });
//    var generateReport = function (results, run) {
//        var pad = function (n) {
//            return n < 10 ? '0' + n : n;
//        };
//        var toISODateString = function (d) {
//            return d.getUTCFullYear() + '-' +
//                pad(d.getUTCMonth() + 1) + '-' +
//                pad(d.getUTCDate()) + 'T' +
//                pad(d.getUTCHours()) + ':' +
//                pad(d.getUTCMinutes()) + ':' +
//                pad(d.getUTCSeconds()) + 'Z';
//        };
//        var convertMillisToSeconds = function (ms) {
//            return Math.round(ms * 1000) / 1000000;
//        };
//        var xmlEncode = function (text) {
//            var baseEntities = {
//                '"': '&quot;',
//                '\'': '&apos;',
//                '<': '&lt;',
//                '>': '&gt;',
//                '&': '&amp;'
//            };
//            return ('' + text).replace(/[<>&\"\']/g, function (chr) {
//                return baseEntities[chr] || chr;
//            });
//        };
//        var XmlWriter = function (settings) {
//            settings = settings || {};
//            var data = [], stack = [], lineBreakAt;
//            var addLineBreak = function (name) {
//                if (lineBreakAt[name] && data[data.length - 1] !== '\n') {
//                    data.push('\n');
//                }
//            };
//            lineBreakAt = (function (items) {
//                var i, map = {};
//                items = items || [];
//                i = items.length;
//                while (i--) {
//                    map[items[i]] = {};
//                }
//                return map;
//            })(settings.linebreak_at);
//            this.start = function (name, attrs, empty) {
//                if (!empty) {
//                    stack.push(name);
//                }
//                data.push('<' + name);
//                for (var aname in attrs) {
//                    data.push(' ' + xmlEncode(aname) + '="' + xmlEncode(attrs[aname]) + '"');
//                }
//                data.push(empty ? ' />' : '>');
//                addLineBreak(name);
//            };
//            this.end = function () {
//                var name = stack.pop();
//                addLineBreak(name);
//                data.push('</' + name + '>');
//                addLineBreak(name);
//            };
//            this.text = function (text) {
//                data.push(xmlEncode(text));
//            };
//            this.cdata = function (text) {
//                data.push('<![CDATA[' + text + ']]>');
//            };
//            this.comment = function (text) {
//                data.push('<!--' + text + '-->');
//            };
//            this.pi = function (name, text) {
//                data.push('<?' + name + (text ? ' ' + text : '') + '?>\n');
//            };
//            this.doctype = function (text) {
//                data.push('<!DOCTYPE' + text + '>\n');
//            };
//            this.getString = function () {
//                while (stack.length) {
//                    this.end();  // internally calls `stack.pop();`
//                }
//                return data.join('').replace(/\n$/, '');
//            };
//            this.reset = function () {
//                data.length = 0;
//                stack.length = 0;
//            };
//            // Start by writing the XML declaration
//            this.pi(settings.xmldecl || 'xml version="1.0" encoding="UTF-8"');
//        };
//        // Generate JUnit XML report!
//        var m, mLen, module, t, tLen, test, a, aLen, assertion, isEmptyElement,
//            xmlWriter = new XmlWriter({
//                linebreak_at: ['testsuites', 'testsuite', 'testcase', 'failure', 'system-out', 'system-err']
//            });
//        xmlWriter.start('testsuites', {
//            name: (window && window.location && window.location.href) || (run.modules.length === 1 && run.modules[0].name) || null,
//            tests: run.total,
//            failures: run.failed,
//            errors: 0,
//            time: convertMillisToSeconds(run.time),  // ms → sec
//        });
//        for (m = 0, mLen = run.modules.length; m < mLen; m++) {
//            module = run.modules[m];
//            xmlWriter.start('testsuite', {
//                id: m,
//                name: module.name,
//                tests: module.total,
//                failures: module.failed,
//                errors: 0,
//                time: convertMillisToSeconds(module.time),  // ms → sec
//                timestamp: toISODateString(module.start)
//            });
//            for (t = 0, tLen = module.tests.length; t < tLen; t++) {
//                test = module.tests[t];
//                xmlWriter.start('testcase', {
//                    name: test.name,
//                    tests: test.total,
//                    failures: test.failed,
//                    errors: 0,
//                    time: convertMillisToSeconds(test.time),  // ms → sec
//                });
//                for (a = 0, aLen = test.failedAssertions.length; a < aLen; a++) {
//                    assertion = test.failedAssertions[a];
//                    isEmptyElement = assertion && !(assertion.actual && assertion.expected);
//                    xmlWriter.start('failure', { type: 'AssertionFailedError', message: assertion.message }, isEmptyElement);
//                    if (!isEmptyElement) {
//                        xmlWriter.start('actual', { value: assertion.actual }, true);
//                        xmlWriter.start('expected', { value: assertion.expected }, true);
//                        xmlWriter.end();  //'failure'
//                    }
//                }
//                xmlWriter.end();  //'testcase'
//            }
//            // Per-module stdout
//            if (module.stdout && module.stdout.length) {
//                xmlWriter.start('system-out');
//                xmlWriter.cdata('\n' + module.stdout.join('\n') + '\n');
//                xmlWriter.end();  //'system-out'
//            }
//            // Per-module stderr
//            if (module.stderr && module.stderr.length) {
//                xmlWriter.start('system-err');
//                xmlWriter.cdata('\n' + module.stderr.join('\n') + '\n');
//                xmlWriter.end();  //'system-err'
//            }
//            xmlWriter.end();  //'testsuite'
//        }
//        xmlWriter.end();  //'testsuites'
//        // Invoke the user-defined callback
//        QUnit.jUnitReport({
//            results: results,
//            xml: xmlWriter.getString()
//        });
//    };
//})();

/**
 * This file is used with PhantomJS to output the results in an XML format that can be consumed by
 * Jenkins as a JUnit result file.
 */

(function() {

    var __tmpModuleName = 100000;


    /**
     * Class to hold each test case result information
     * @param {Object} name the name of the test case
     */
    var cModuleTestCaseResult = function() {
        this.start = new Date();
        this.failures = [];
        this.errors = [];
        this.result = null;
    };

    cModuleTestCaseResult.getFailureXml = function(details) {
        var message = details.message || "";
        if (details.expected) {
            if (message) {
                message += ", ";
            }
            message = "expected: " + details.expected + ", but was: " + details.actual;
        }
        var xml = '<failure type="failed" message="' + message + '"/>\n';
        return xml;
    };

    cModuleTestCaseResult.prototype.addTestDetails = function(details) {
        this.failures.push(details);
    };

    cModuleTestCaseResult.prototype.setResult = function(result) {
        this.result = result;
        this.end = new Date();
    }

    cModuleTestCaseResult.prototype.getXml = function(moduleName) {

        // If the result was never set, add to the errors list
        if (!this.result) {
            this.errors.push('<error type="NoResultException" message="The result for the cModuleTestCaseResult was not set prior to the call to getXml" />')
        }

        // Construct the XML
        var name = this.result ? this.result.name : "undefined";
        var xml = ['\t\t<testcase name="', name,
            '" classname="', moduleName,
            '" time="', (this.end - this.start) / 1000,
            '">\n'];

        // Go through all failures
        for (var i = 0, l = this.failures.length; i < l; i++) {
            xml.push("\t\t\t", cModuleTestCaseResult.getFailureXml(this.failures[i]));
        }

        // Go through all errors
        for (var i = 0, l = this.errors.length; i < l; i++) {
            xml.push("\t\t\t", this.errors[i]);
        }

        xml.push('\t\t</testcase>\n');
        return xml.join('');
    };

    /**
     * Class to hold the test result information for a module
     * @param {Object} name the module name
     */
    var cModuleResult = function(name) {
        this.name = name;
        this.start = new Date();
        this.testCases = {};
        this.errors = [];
        this.result = null;
    };

    cModuleResult.prototype.addTestCaseResult = function(name) {
        if (!this.testCases[name]) {
            var testCaseResult = new cModuleTestCaseResult();
            this.testCases[name] = testCaseResult;
        }
        return this.testCases[name];
    }

    cModuleResult.prototype.setResult = function(result) {
        this.result = result;
        this.end = new Date();
    };

    cModuleResult.prototype.getXml = function(id) {
        if (!this.result) {
            this.errors.push("<system-err>The result for the cModuleResult was not set prior to the call to getXml</system-err>")
        }

        var failed = this.result ? this.result.failed : 0;
        var total = this.result ? this.result.total : 0;
        var errors = this.errors.length;

        // Construct the XML
        var xml = ['\t<testsuite id="', id,
            '" package="', this.name,
            '" name="', this.name,
            '" errors="', errors,
            '" failures="', failed,
            '" tests="', total,
            '" hostname="', escape(window.location.hostname),
            '" timestamp="', this.start.toISOString(),
            '" time="', (this.end - this.start) / 1000,
            '">\n'];
        for (var i in this.testCases) {
            xml.push(this.testCases[i].getXml(this.name));
        }

        for (var i = 0, l = this.errors.length; i < l; i++) {
            xml.push(this.errors[i]);
        }

        xml.push('\t</testsuite>');
        return xml.join('');
    };


    /**
     * Constructor.  Will set the output marker based on the query string
     * The outputMarker is used to mark each line of a QUnit console.log for use
     * with other programs
     */
    var cJUnitOutputter = function() {
        var qs = window.location.search.replace('?', ''),
            queryArgs = qs.split('&'),
            queryParams = {};
        for(var i = 0, l = queryArgs.length; i < l; i++) {
            var tmp = queryArgs[i].split('=');
            queryParams[tmp[0]] = tmp.length > 0 ? tmp[1] : "";
        }

        // Set the indicator
        this.outputMarker = queryParams["outputMarker"] || "";
        this.outputFormat = queryParams["outputFormat"] || "junit";

        console.log("---", queryParams["outputMarker"]);

        // Internal array of cModuleResult objects
        this.moduleResults = {};
        this.lastModuleStart = {};

    };

    /**
     * Adds a new cModuleResult object to the internal collection
     * @param {Object} name the name of the module.  If none provided, it will auto create one (number based)
     */
    cJUnitOutputter.prototype.addModuleResult = function(name) {

        // If this module doesn't have a name, then use the tmpModuleName
        if (!name || name == '') {
            name = __tmpModuleName;
            __tmpModuleName++;
        }

        console.log("module", name);
        // Check to see if this module already exists.  If not, don't create it
        if (!this.moduleResults[name]) {
            var moduleResult = new cModuleResult(name);
            this.moduleResults[name] = moduleResult;
        }

        return this.moduleResults[name];
    };

    /**
     * Initialize and override the default QUnit methods
     */
    cJUnitOutputter.prototype.init = function() {

        // Log the start of the XML
        var oThis = this;

        // Update some of the QUnit configs so that everything runs smoothly on every run
        QUnit.config.reorder = false;
        QUnit.config.blocking = false;

        // Override everything
        QUnit.begin = function() {
            this.begin.call(oThis)
        };
        QUnit.moduleStart = function(context) {
            this.moduleStart.call(oThis, context);
        };
        QUnit.moduleDone = function(context) {
            this.moduleDone.call(oThis, context);
        };
        QUnit.testStart = function(context){
            this.testStart.call(oThis, context);
        }
        QUnit.testDone = function(result){
            this.testDone.call(oThis, result);
        };
        QUnit.log = function(details){
            this.log.call(oThis, details);
        };
        QUnit.done = function(result){
            //this.done.call(oThis, result);
        };
    };

    /**
     * Log a message to the console
     * @param {Object} msg
     */
    cJUnitOutputter.prototype.consoleLog = function(msg) {
        if (this.outputFormat == "console" || (this.outputFormat == "junit" && this.outputMarker != '')) {
            console.log(this.outputMarker + msg);
        }
    };

    /**
     * Override the .begin method
     */
    cJUnitOutputter.prototype.begin = function() {
        // nothing to do...
    };


    /**
     * Override the .moduleStart method
     * @param {Object} context the current context for this module
     */
    cJUnitOutputter.prototype.moduleStart = function(context) {
        this.lastModuleStart = context;
        this.addModuleResult(context.name);
    };

    /**
     * Override the .moduleDone method
     * @param {Object} result the result after running this module
     */
    cJUnitOutputter.prototype.moduleDone = function(result) {
        if(this.moduleResults[result.name]){
            this.moduleResults[result.name].setResult(result);
        }else if(this.lastModuleStart && this.moduleResults[this.lastModuleStart.name]){
            this.moduleResults[this.lastModuleStart.name].setResult(result);
        }
    };

    /**
     * Override the .testStart method
     */
    cJUnitOutputter.prototype.testStart = function(context) {
        this.moduleResults[context.module].addTestCaseResult(context.name);
    };

    /**
     * Override the .testDone method
     * @param {Object} result the result after running this test
     */
    cJUnitOutputter.prototype.testDone = function(result) {
        this.moduleResults[result.module].testCases[result.name].setResult(result);
    };

    /**
     * Override the .log method
     * @param {Object} details log information
     */
    cJUnitOutputter.prototype.log = function(details) {

        // only log if the result failed
        if (details.result) {
            return;
        }
        var c = QUnit.config.current;
        if (c.module && c.testName) {
            this.moduleResults[c.module].testCases[c.testName].addTestDetails(details);
        }
    };

    /**
     * Override the .done method
     * @param {Object} result the overall result information for this test suite
     */
    cJUnitOutputter.prototype.done = function(result) {
        return result.failed > 0 ? 1 : 0;
    };

    /**
     * Get the entire JUnit XML result for all test suites
     */
    cJUnitOutputter.prototype.writeXML = function() {
        var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<testsuites>\n';


        var j = 0;
        for (var i in this.moduleResults) {
            xml += this.moduleResults[i].getXml(j) + "\n";
            j++;
        }
        xml += '</testsuites>\n';
        this.consoleLog(xml);
        return xml;
    };

    /**
     * Writes a system error to the output.  Used if there was a major system error.
     * @param {String} msg the error message to write
     */
    cJUnitOutputter.prototype.writeSystemError = function(msg) {
        var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<testsuites name=" '+ document.getElementById("qunit-header").innerText+ ' ">\n';
        xml += '<system-err>' + msg + '</system-err>\n';
        xml += '</testsuites>\n';
        this.consoleLog(xml);
        return xml;
    };

    cJUnitOutputter.prototype.getCodeCoverage = function(){
        return steal.instrument ? steal.instrument.compileStats() : null;
    };

    // Instanciate a new object and initialize it.
    // Place it in the document scope so that it can be accessed later from phantomjs-qunit-runner.js
    document.oJUnitOutputter = new cJUnitOutputter();
    document.oJUnitOutputter.init();

})();