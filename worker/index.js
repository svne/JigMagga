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

var domain = require('domain'),
    es = require('event-stream'),
    _ = require('lodash'),
    path = require('path'),
    getRedisClient = require('./lib/redisClient'),
    program = require('commander');

var amqp = require('./lib/amqp'),
    log = require('./lib/logger')('worker', {component: 'worker', processId: String(process.pid)}),
    ProcessRouter = require('./lib/router'),
    configMerge = require('./lib/configMerge'),
    messageHelper = require('./lib/message'),
    archiver = require('./lib/archiver'),
    helper = require('./lib/helper'),
    error = require('./lib/error'),
    stream = require('./lib/streamHelper'),
    messageSource = require('./lib/messageSource');

var config = require('./config');
var WorkerError = error.WorkerError;

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

//if queue argument exists connect to amqp queues 
if (program.queue) {
    var connection = amqp.getConnection(config.amqp.credentials);
    var queues = helper.getQueNames(program, config.amqp);

    log('queues in pool %j', queues, {});
    var queuePool = new amqp.QueuePool(queues, connection, {prefetch: config.amqp.prefetch});
}

var basePath = (program.args[0]) ? path.join(process.cwd(), program.args[0]) : process.cwd();

var getMeta = helper.getMeta;

/**
 * handle non fatal error regarding with message parsing
 * 
 * @param  {{origMessage: object, message: string, stack: string}} err
 */
var workerErrorHandler = function (err) {
    console.log('workerErrorHandler');
    log('error', 'Error while processing message: %j',  err, err.originalMaessage, {});
    if (!program.queue) {
        return;
    }
    //if there is shift function for this message in the storage shift message from main queue
    helper.executeAck(err.messageKey);

    var originalMaessage = err.originalMaessage || {};
    originalMaessage.error = err.message;

    queuePool.amqpErrorQueue.publish(originalMaessage);

    if (!program.live) {
        queuePool.amqpDoneQueue.publish(originalMaessage);
    }
};


/**
 * Pipes message from source stream to filter stream then to configuration
 * then split them by locale or pages and then send a messages to generator process 
 * 
 * @param  {Readable} source
 * @param  {object}   generator
 */
var mainStream = function (source, generator) {
    var tc = stream.tryCatch('err');

    tc(source)
        .pipe(es.through(function (data) {
            console.log('filter', data);
            if (!helper.isMessageFormatCorrect(data.message)) {
                if (_.isFunction(data.queueShift)) {
                    data.queueShift();
                }

                return this.emit('err', new WorkerError('something wrong with message fields', data.message));
            }
            data.basePath = basePath;
            log('filtered message', getMeta(data.message));

            helper.setAckToStorage(data);
            this.emit('data', data);
        }))
        .pipe(tc(configMerge.getConfigStream()))
        .pipe(tc(messageHelper.pageLocaleSplitter()))

        //add page configs for those messages that did not have page key before splitting
        .pipe(tc(configMerge.getConfigStream()))
        .on('data', function (data) {
            data.message = messageHelper.createMessage(data.message, program, data.config);
            data.bucketName = helper.generateBucketName(data, program);

            log('send to generator', getMeta(data.message));
            generator.send('new:message', data);
        });

    tc.catch(workerErrorHandler);
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

        log('shift message from amqp queue');
        helper.executeAck(data.key);

        archiverStream = archiver.bulkArchive(data.uploadList);
        data = null;

        if (program.write) {
            destination = helper.createSaveZipStream(program, message, basePath);
            destination.once('finish', function () {
                log('saved on disk', getMeta(message));
            });
        } else {
            destination = stream.accumulate(function(err, data, next) {
                var that = this;
                var cb =  function () {
                    result = null;
                    data = null;
                    archiverStream = null;
                    next();
                };
                var result = {url: message.url, data: data};
                if (program.queue) {
                    uploaderRouter.send('reduce:timeout');
                    return redisClient.rpush(config.redis.keys.list, JSON.stringify(result), function (err) {
                        if (err) {
                            return that.emit('error', new WorkerError(err.message || err), data.message.origMessage);
                        }
                        log('generated message sended to redis', getMeta(message));
                        cb();
                    });
                }
                log('[WORKER] send message to upload', getMeta(message));
                uploaderRouter.send('pipe', result);
                cb();
            });
        }
        var tc = stream.tryCatch();

        tc(archiverStream).pipe(tc(destination));
        tc.catch(workerErrorHandler);
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
    },
    error: workerErrorHandler
};

var args = _.clone(process.argv).splice(2);

// Creates a generator and uploader child processes,
// creates a router for them
helper.createChildProcesses(args, function (err, result) {
    if (err) {
        throw new Error(err);
    }

    var uploader = result.uploader,
        generator = result.generator;

    generatorRouter = new ProcessRouter(generator);
    uploaderRouter = new ProcessRouter(uploader);

    generatorRouter.addRoutes(generatorRoutes);
    uploaderRouter.addRoutes({error: workerErrorHandler});

    var source;

    //creates a message source and pass it to the mainStream function
    if (program.queue) {
        source = messageSource.getQueueSource(program, log, queuePool);
    } else if (program.staticold) {
        source = messageSource.getStaticOldSource(program, log, basePath);
    } else {
        source = messageSource.getDefaultSource(program, log);
    }

    mainStream(source, generatorRouter);
});

process.on('uncaughtException', error.getErrorHandler(log, workerErrorHandler));

if (process.env.NODE_ENV === 'local') {
    memwatch.on('leak', function(info) {
        log('warn', '[MEMORY:LEAK] %j', info, {memoryLeak: true});
    });
}
