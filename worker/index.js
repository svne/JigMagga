#! /usr/local/bin/node
'use strict';


/**
 * Main application module
 *
 * Responsibilities:
 * 
 * - analyze application arguments
 * - creates generator and uploader child process
 * - creates a message source stream 
 * - parse message add config to it and send them to generator
 * - obtain generated pages from generator process
 * - creates a zip for them if needed 
 * - push them to the uploader via reddis or directly
 * 
 * @module worker
 */

var _ = require('lodash'),
    path = require('path'),
    getRedisClient = require('./lib/redisClient'),
    program = require('commander');

var log = require('./lib/logger')('worker', {component: 'worker', processId: String(process.pid)}),
    ProcessRouter = require('./lib/router'),
    configMerge = require('./lib/configMerge'),
    messageHelper = require('./lib/message'),
    archiver = require('./lib/archiver'),
    helper = require('./lib/helper'),
    stream = require('./lib/streamHelper'),
    messageSource = require('./lib/messageSource');

var config = require('./config');
if (config.main.nodetime) {
    log('connect to nodetime for profiling');
    require('nodetime').profile(config.main.nodetime);
}

if (process.env.NODE_ENV === 'local') {
    var memwatch = require('memwatch');
}

log('started app pid %d current env is %s', process.pid, process.env.NODE_ENV);

program
    .option('-c, --cityId <n>', 'define location by cityId', parseInt)
    .option('-s, --regionId <n>', 'define location by regionId', parseInt)
    .option('-o, --districtId <n>', 'define location by districtId', parseInt)
    .option('-l, --linkId <n>', 'define internlinkpage by linkId', parseInt)
    .option('-v, --values [values]', 'specify values as JSON')
    .option('-r, --restaurantId <n>', 'define restaurant by restaurantId', parseInt)
    .option('-R, --satelliteId <n>', 'define restaurant by satelliteId', parseInt)
    .option('-b, --versionnumber [value]', 'specify build version as float')
    .option('-q, --queue', 'start program to listen on queue')
    .option('-e, --errorqueue', 'use error queue')
    .option('-E, --errorerrorqueue', 'use errorerror queue')
    .option('-y, --staticold', 'generate all old static pages (sem)')
    .option('-d, --basedomain [value]', 'specify the domain')
    .option('-p, --page [value]', 'define the template to be generated')
    .option('-k, --childpage [value]', 'define a child page that should overwrite the parent element')
    .option('-x, --live', 'use live db and queue - normally staging is used')
    .option('-X, --liveuncached', 'use live db and uncache queue')
    .option('-u, --url [value]', 'define the url to be generated')
    .option('-H, --highprio', 'use the high priority queue')
    .option('-M, --mediumprio', 'use the high priority queue')
    .option('-L, --lowprio', 'use the high priority queue')
    .option('-V, --postfix', 'use this version postfix queue')
    .option('-a, --archive', 'archive file before upload')
    .option('-D, --stageversion', 'upload file to subdomain with current branch name (2.5 -> stage-2-5.lieferando.de)')
    .option('-I, --locale <n>', 'use given locale')
    .option('-w, --write [value]', 'write to disk the archive with generated files instead of upload them, path should be provided')
    .parse(process.argv);

// get redis Client
var redisClient = getRedisClient(function error(err) {
    log('redis Error %j', err, {redis: true});
}, function success() {
    log('redis client is ready', {redis: true});
});

var basePath = (program.args[0]) ? path.join(process.cwd(), program.args[0]) : process.cwd();

var messageKeyStorage = {};

var getMeta = helper.getMeta;

/**
 * Pipes message from source stream to filter stream then to configuration
 * then split them by locale or pages and then send a messages to generator process 
 * 
 * @param  {Readable} source
 * @param  {object}   generator
 */
var mainStream = function (source, generator) {
    source
        .pipe(stream.filter(function (data) {
            if (!helper.isMessageFormatCorrect(data.message)) {
                log('error', 'something wrong with message fields');
                return false;
            }
            data.basePath = basePath;
            log('filtered message', getMeta(data.message));

            if(_.isFunction(data.queueShift) && data.key) {
                messageKeyStorage[data.key] = data.queueShift;
            }

            return true;
        }))
        .pipe(configMerge.getConfigStream())
        .pipe(messageHelper.pageLocaleSplitter())

        //add page configs for those messages that did not have page key before splitting
        .pipe(configMerge.getConfigStream())
        .on('data', function (data) {
            data.message = messageHelper.createMessage(data.message, program, data.config);
            data.bucketName = helper.generateBucketName(data, program);

            log('send to generator', getMeta(data.message));
            generator.send('new:message', data);
        });
};

var generatorRouter,
    uploaderRouter;

var generatorRoutes = {
    /**
     * generator pipe handler. Invokes for all messages that passes from
     * generator process via pipe. 
     * Creates a zip archive from upload file list and write it to a disk
     * or send it to the uploader regarding to the value write key of application
     * 
     * @param  {{uploadList: Object[], message: object, key: string}} data [description]
     */
    pipe: function (data) {
        var archiverStream,
            destination,
            message;

        data = JSON.parse(data);
        message = data.message;

        log('message from pipe generator, key %s', data.key,  getMeta(message));

        if (data.key && _.isFunction(messageKeyStorage[data.key])) {
            log('shift message from amqp queue');
            messageKeyStorage[data.key]();
            delete messageKeyStorage[data.key];
        }

        archiverStream = archiver.bulkArchive(data.uploadList);
        data = null;

        if (program.write) {
            destination = helper.createSaveZipStream(program, message, basePath);
            destination.once('finish', function () {
                log('saved on disk', getMeta(message));
            });
        } else {
            destination = stream.accumulate(function(err, data, next) {
                var cb =  function () {
                    result = null;
                    data = null;
                    archiverStream = null;
                    next();
                };
                var result = {url: message.url, data: data};
                if (program.queue) {
                    uploaderRouter.send('reduce:timeout');
                    return redisClient.rpush(config.redis.keys.list, JSON.stringify(result), function () {
                        log('generated message sended to redis', getMeta(message));
                        cb();
                    });
                }
                log('[WORKER] send message to upload', getMeta(message));
                uploaderRouter.send('pipe', result);
                cb();
            });
        }

        archiverStream.pipe(destination);
    },
    /**
     * if zip is creating in the generator. Generator just send a link to it
     * to the worker and worker proxies this message to uploader
     * 
     * @param  {{zipPath: string, message: object}} data
     */
    'new:zip': function (data) {
        log('new zip saved by generator', helper.getMeta(data.message));
        uploaderRouter.send('new:zip', {url: data.message.url, zipPath: data.zipPath});
    }
};

var args = _.clone(process.argv).splice(2);

// Creates a generator and uploader child processes,
// creates a router for them
helper.createChildProcesses(args, function (err, result) {
    if (err) {
        console.log(err);
        return;
    }

    var uploader = result.uploader,
        generator = result.generator;

    generatorRouter = new ProcessRouter(generator);
    uploaderRouter = new ProcessRouter(uploader);

    generatorRouter.addRoutes(generatorRoutes);

    var source;

    //creates a message source and pass it to the mainStream function
    if (program.queue) {
        source = messageSource.getQueueSource(program, log);
    } else if (program.staticold) {
        source = messageSource.getStaticOldSource(program, log, basePath);
    } else {
        source = messageSource.getDefaultSource(program, log);
    }

    mainStream(source, generatorRouter);
});

process.on('uncaughtException', function (err) {
    log('error', '%s %j', err, err.stack, {uncaughtException: true});
    process.kill();
});

if (process.env.NODE_ENV === 'local') {
    memwatch.on('leak', function(info) {
        log('warn', '[MEMORY:LEAK] %j', info, {memoryLeak: true});
    });
}
