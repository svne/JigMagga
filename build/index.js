/**
 * Created by toni on 7/28/14.
 */

var es = require('event-stream'),
    configMerger = require('./lib/configMerger.js'),
    helper = require('./lib/helper.js'),
    steal = require('./lib/steal.js'),
    builder = require('./lib/builder.js'),
    program = require('commander'),
    path = require('path');


program
    .option('-v, --versionnumber [value]', 'specify build version as float')
    .option('-d, --basedomain [value]', 'specify the domain')
    .option('-p, --page [value]', 'define the template to be generated')
    .option('-a, --archive', 'archive file before upload')
    .option('-I, --locale', 'use given locale')
    .option('-c, --css', 'generate only css')
    .option('-j, --js', 'generate only js')
    .option('-n, --namespace', 'the namespace of your project')
    .option('-b, --basePath', 'the basepath to your page directory')
    .parse(process.argv);


helper.createStreamWithSettings(program)
    .pipe(configMerger.getConfig())
    .pipe(configMerger.getPagesThatMatchThePageParam())
    .pipe(configMerger.getAllMergedConfigsFromPages())
    .pipe(steal.getJSAndHTMLFilePath())
    .pipe(steal.openPagesAndGrepDependencies())
    .pipe(helper.splitPagesIntoSingleStreams())
    .pipe(helper.duplicatePagesForLocalesAndBrowsers())
    .pipe(steal.checkDependenciesForBrowserSupport())
    .pipe(steal.getCurrentView())
    .pipe(builder.view.compile())
    .pipe(steal.setCurrentSCSSVariables())
    .pipe(builder.css.compileSCSS())
    .pipe(builder.makePackage())
    .pipe(es.map(function (data, callback) {
//        console.log(data.js)
//        console.log("-------------------");
        callback(null, data)
    }));




