/**
 * Created by toni on 7/28/14.
 */

var winston = require('winston'),
    es = require('event-stream'),
    configMerger = require('./lib/configMerger.js'),
    helper = require('./lib/helper.js'),
    steal = require('./lib/steal.js'),
    builder = require('./lib/builder.js'),
    program = require('commander'),
    path = require('path');


program
    .version('1.0.0')
    .option('-v, --versionnumber [value]', 'specify build version as float', parseFloat)
    .option('-d, --basedomain [value]', 'specify the domain')
    .option('-p, --page [value]', 'define the template to be generated can be a regex')
    .option('-a, --archive', 'archive file before upload')
    //TODO override locales from config
    .option('-I, --locale [value]', 'use given locale')
    .option('-c, --cssgenerate [value]', 'generate only css', JSON.parse)
    .option('-j, --jsgenerate [value]', 'generate only js', JSON.parse)
    .option('-n, --namespace [value]', 'the namespace of your project')
    .option('-b, --basePath [value]', 'the basepath to your page directory')
    .option('-m, --minify [value]', 'minify css and js Default true', JSON.parse)
    .option('-u, --upload', 'if upload is not enabled it will save files to disk', JSON.parse)
    .option('-x, --live [value]', 'will generate for live environment',  JSON.parse)
    .option('-s, --stream [value]', 'pipe a build stream via stdin. The value is the startpoint name.')
    .parse(process.argv);



if (program.stream) {
    console.log = function(){/*DISABLED*/}
    console.warn = function(){/*DISABLED*/}
}
/**
 * Default Task without stream
 */
if (!program.stream) {

    helper.createStreamWithSettings(program)
        .pipe(configMerger.getConfig())
        .pipe(configMerger.getPagesThatMatchThePageParam())
        .pipe(configMerger.getAllMergedConfigsFromPages())
        .pipe(steal.getJSAndHTMLFilePath())
        .pipe(helper.splitPagesIntoSingleStreams())
        .pipe(helper.duplicatePagesForLocalesAndBrowsers())
        .pipe(helper.bufferAllPagesAndWaitingForDoneEvent())
        .pipe(steal.openPageAndGrepDependencies())
        .pipe(builder.view.compile())
        .pipe(steal.setCurrentSCSSVariables())
        .pipe(builder.css.compileSCSS())
        .pipe(builder.js.clean())
        .pipe(builder.js.translate())
        .pipe(builder.js.minify())
        .pipe(builder.css.minify())
        .pipe(builder.makePackage())
        .pipe(helper.triggerDonePageEvent())
        .pipe(helper.joinPagesIntoSingleStreams())
        .pipe(helper.saveFileToDiskOrUpload());

}
else if (program.stream === true) {

    helper.createStreamWithSettings(program)
        .pipe(configMerger.getConfig())
        .pipe(configMerger.getPagesThatMatchThePageParam())
        .pipe(configMerger.getAllMergedConfigsFromPages())
        .pipe(steal.getJSAndHTMLFilePath())
        .pipe(es.stringify())
        .pipe(process.stdout)

}
else if (program.stream === "steal") {

    process.stdin.setEncoding('utf8');
    process.stdin
        .pipe(es.wait())
        .pipe(es.parse())
        .pipe(helper.splitPagesIntoSingleStreams())
        .pipe(helper.duplicatePagesForLocalesAndBrowsers())
        .pipe(helper.bufferAllPagesAndWaitingForDoneEvent())
        .pipe(steal.openPageAndGrepDependencies())
        .pipe(helper.triggerDonePageEvent())
        .pipe(helper.stdoutSingleObjectWithBumper());

    process.stdin.on('end', function () {
        process.stdin.resume();
    });
}
else if (program.stream === "js") {

    process.stdin.setEncoding('utf8');
    process.stdin
        .pipe(helper.bufferStringifyStreamWithBumperAndParseSingleObject())
        .pipe(builder.view.compile())
        .pipe(builder.js.clean())
        .pipe(builder.js.translate())
        .pipe(builder.js.minify())
        .pipe(builder.makePackage())
        .pipe(helper.stdoutSingleObjectWithBumper());

    process.stdin.on('end', function () {
        process.stdin.resume();
    });
}
else if (program.stream === "css") {

    process.stdin.setEncoding('utf8');
    process.stdin
        .pipe(helper.bufferStringifyStreamWithBumperAndParseSingleObject())
        .pipe(steal.setCurrentSCSSVariables())
        .pipe(builder.css.compileSCSS())
        .pipe(builder.css.minify())
        .pipe(builder.makePackage())
        .pipe(helper.stdoutSingleObjectWithBumper());

    process.stdin.on('end', function () {
        process.stdin.resume();
    });
}
else if (program.stream === "save") {

    process.stdin.setEncoding('utf8');
    process.stdin
        .pipe(helper.bufferStringifyStreamWithBumperAndParseSingleObject())
        .pipe(helper.joinPagesIntoSingleStreams())
        .pipe(helper.saveFileToDiskOrUpload());

    process.stdin.on('end', function () {
        process.stdin.resume();
    });
}


