#! /usr/local/bin/node
'use strict';

var _ = require('lodash'),
    es = require('event-stream'),
    path = require('path'),
    getRedisClient = require('./lib/redisClient'),
    program = require('commander');

var amqp = require('./lib/amqp'),
    memwatch = require('memwatch'),
    log = require('./lib/logger')('worker', {component: 'worker', processId: String(process.pid)}),
    ProcessRouter = require('./lib/router'),
    configMerge = require('./lib/configMerge'),
    messageHelper = require('./lib/message'),
    archiver = require('./lib/archiver'),
    helper = require('./lib/helper'),
    stream = require('./lib/streamHelper');

var config = require('./config');

if (config.main.nodetime) {
    log('connect to nodetime for profiling');
    require('nodetime').profile(config.main.nodetime);
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
    .option('-i, --static', 'generate all new static pages (info-center)')
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


var redisClient = getRedisClient(function error(err) {
    log('redis Error %j', err, {redis: true});
}, function success() {
    log('redis client is ready', {redis: true});
});

var basePath = (program.args[0]) ? path.join(process.cwd(), program.args[0]) : process.cwd();

//main stream
var mainStream = function (source, generator) {
    source
        .pipe(stream.filter(function (data) {
            if (!helper.isMessageFormatCorrect(data.message)) {
                log('error', 'something wrong with message fields');
                return false;
            }
            data.basePath = basePath;
            return true;
        }))
        .pipe(stream.log(log, '[FILTERED:MESSAGE]'))

        .pipe(configMerge.getConfigStream())
        .pipe(messageHelper.pageLocaleSplitter())

        //add page configs for those messages that did not have page key before splitting
        .pipe(configMerge.getConfigStream())
        .pipe(es.through(function (message) {
            message.message = messageHelper.createMessage(message.message, program, message.config);
            message.bucketName = helper.generateBucketName(message, program);
            this.emit('data', message);
        }))
        .on('data', function (data) {
            if (data.queueShift) {
                data.queueShift();
                delete data.queueShift;
            }
            log('send to generator', {page: data.message.page, url: data.message.url, locale: data.message.locale});
            generator.send('new:message', data);
        })
        .on('error', function (err) {
            log('error', 'main stream %j', err, {error: true});
        });
};

var generatorRouter,
    uploaderRouter;

var generatorRoutes = {
    pipe: function (data) {
        var uploadFileList,
            archiverStream,
            destination,
            message;

        data = JSON.parse(data);
        message = data.message;
        var metadata = {page: message.page, url: message.url, locale: message.locale};
        log('message from pipe generator', metadata);

        uploadFileList = data.json.reduce(function (result, currentItem) {
            return result.concat(currentItem);
        }, data.html);

        data = null;
        archiverStream = archiver.bulkArchive(uploadFileList);

        if (program.write) {
            destination = helper.createSaveZipStream(program, message, basePath);
        } else {
            destination = stream.accumulate(function(err, data, next) {
                uploadFileList = [];
                var result = {url: message.url, data: data};
                if (program.queue) {
                    uploaderRouter.send('reduce:timeout');
                    return redisClient.rpush(config.redis.keys.list, JSON.stringify(result), function () {
                        next();
                        log('generated message sended to redis', metadata)
                        result = null;
                        data = null;
                        archiverStream = null;
                    });
                }
                log('[WORKER] send message to upload', metadata);
                uploaderRouter.send('pipe', result);
                result = null;
                data = null;
                archiverStream = null;
                next();
            });
        }

        archiverStream.pipe(destination)
            .on('finish', function () {
                if (program.write) {
                    return console.log('saved!!');
                }
                console.log('sanded to uploader');
            });
    }
};

var args = _.clone(process.argv).splice(2);

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

    if (program.queue) {
        var connection = amqp.getConnection(config.amqp.credentials);
        var queues = helper.getQueNames(program, config.amqp);

        log('queues %j', queues, {});

        var queueStreams = _.values(queues).map(function (queueName) {
            var amqpStream = amqp.getStream({
                queue: queueName,
                exchange: 'amq.direct',
                connection: connection
            });
            amqpStream.on('ready', function (queue) {
                log('%s is connected', queue);
            });
            return amqpStream;
        });

        source = es.merge.apply(es, queueStreams)
            .pipe(messageHelper.getMessageParser())
            .pipe(stream.log(log, '[PARSED:MESSAGE]'));

    } else {
        var data = {
            message: _.pick(program, ['basedomain', 'url', 'page', 'locale'])
        };
        var values = {};
        if (program.values) {
            values = JSON.parse(program.values);
        } else {
            values = _.pick(program, function (value, key) {
                return (new RegExp('.*Id$', 'ig')).test(key);
            });
        }
        data.message = _.assign(data.message, values);
        source = es.readArray([data]);
    }

    mainStream(source, generatorRouter);

});

process.on('uncaughtException', function (err) {
    log('error', '%s %j', err, err.stack, {uncaughtException: true});
    process.kill();
});

memwatch.on('leak', function(info) {
    log('warning', '[MEMORY:LEAK] %j', info, {memoryLeak: true});
});