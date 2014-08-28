/**
 * Created by toni meuschke on 7/28/14.
 *
 *
 * example usage:
 *
 *  $ node build/index.js -p ".*" -d lieferando.de
 *
 *  take care that the command above take a lot of memory because it will load all data in your memory and will go with this data step by step
 *  for less memory usage use unix piping eg.
 *
 *  $ node build/index.js -p ".*" -d "lieferando.de" -n yd -s | node build/index.js -s steal | node build/index.js -s js  | node build/index.js -s css | node build/index.js -s save
 *
 *  -n is your project namespace eg. yd
 *  -s is the stream version. Without value means that you want to start and create a stream object then you have different options to pipe (steal/js/css/save) this options need the stream from the start with all his options eg. -n -u
 *  -v is the version number that will be used for the files when you do not specify this version it will create a file withoute like -> production-de_DE.js
 *  -f you can specify a file with a stream content that you have created from -s option like
 *
 *      $ node build/index.js -p ".*" -d "lieferando.de" -n yd -s >> save.stream
 *      $ node build/index.js  -s steal -f save.stream
 */

var winston = require('winston'),
    es = require('event-stream'),
    configMerger = require('./lib/configMerger.js'),
    helper = require('./lib/helper.js'),
    steal = require('./lib/steal.js'),
    builder = require('./lib/builder.js'),
    program = require('commander'),
    fs = require('fs'),
    path = require('path');


program
    .version('1.0.0')
    .option('-v, --versionnumber [value]', 'specify build version as float', parseFloat)
    .option('-d, --basedomain [value]', 'specify the domain')
    .option('-p, --page [value]', 'define the template to be generated can be a regex')
    //TODO archive the files and upload as zip
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
    .option('-f, --file [value]', 'The stream input that will be used.')
    .parse(process.argv);


if (program.stream) {
    console.log = function(){/*DISABLED*/}
    console.warn = function(){/*DISABLED*/}
}
if (program.file) {
    var readStream = fs.createReadStream(program.file);
    readStream.pipe(process.stdin);
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
/**
 * stream based tasks
 *
 * will create a stream and set all options and configurations
 */
else if (program.stream === true) {

    helper.createStreamWithSettings(program)
        .pipe(configMerger.getConfig())
        .pipe(configMerger.getPagesThatMatchThePageParam())
        .pipe(configMerger.getAllMergedConfigsFromPages())
        .pipe(steal.getJSAndHTMLFilePath())
        .pipe(es.stringify())
        .pipe(process.stdout)

}
/**
 * will steal all files based on page and conf
 */
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
/**
 * will transform the stream to translate js files and minify them
 */
else if (program.stream === "js") {

    process.stdin.setEncoding('utf8');
    process.stdin
        .pipe(helper.bufferStringifyStreamWithBumperAndParseSingleObject())
        .pipe(builder.view.compile())
        .pipe(builder.js.clean())
        .pipe(builder.js.translate())
        .pipe(builder.js.minify())
        .pipe(builder.makePackage())
       // .pipe(helper.stdoutSingleObjectWithBumper());

    process.stdin.on('end', function () {
        process.stdin.resume();
    });
}
/**
 * will compile scss to css and minify the css
 */
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

/**
 * will save a files to disk or upload them to CDN based on stream configuration
 */
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


