#! /usr/local/bin/node
'use strict';

var clc = require('cli-color'),
    _ = require('lodash'),
    es = require('event-stream'),
    path = require('path'),
    getRedisClient = require('./lib/redisClient'),
    program = require('commander');

var amqp = require('./lib/amqp'),
    ProcessRouter = require('./lib/router'),
    configMerge = require('./lib/configMerge'),
    messageHelper = require('./lib/message'),
    archiver = require('./lib/archiver'),
    helper = require('./lib/helper'),
    stream = require('./lib/streamHelper');

var config = require('./config');

if (config.main.nodetime) {
    console.log('connect to nodetime for profiling', config.main.nodetime);
    require('nodetime').profile(config.main.nodetime);
}

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
    console.log("[Redis] Error " + err);
}, function success() {
    console.log("[Redis] client is ready");
});

var basePath = (program.args[0]) ? path.join(process.cwd(), program.args[0]) : process.cwd();

//main stream
var mainStream = function (source, generator) {
    source
        .pipe(stream.filter(function (data) {
            if (!helper.isMessageFormatCorrect(data.message)) {
                console.error('something wrong with message fields');
                return false;
            }
            data.basePath = basePath;
            return true;
        }))
        .pipe(stream.log('[FILTERED:MESSAGE]'))

        .pipe(configMerge.getConfigStream())
        .pipe(messageHelper.pageLocaleSplitter())

        .pipe(es.through(function (data) {
            console.log('[SPLITTER]', data.message);
            this.emit('data', data);
        }))

        //add page configs for those messages that did not have page key before splitting
        .pipe(configMerge.getConfigStream())
        .pipe(es.through(function (message) {
            message.message = messageHelper.createMessage(message.message, program, message.config);
            message.bucketName = helper.generateBucketName(message, program);
            this.emit('data', message);
        }))
        .on('data', function (data) {
            generator.send('new:message', data);
        })
        .on('error', function (err) {
            console.log('ERROR', err);
        });
};

var generatorRouter,
    uploaderRouter;

var generatorRoutes = {
    log: function (data) {
        console.log('[from generator]', data);
    },
    pipe: function (data) {
        var uploadFileList,
            archiverStream,
            destination,
            message;

        data = JSON.parse(data);
        message = data.message;
        console.log('message from pipe generator pipe', message.page, message.url, message.locale);

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
                    return redisClient.rpush(config.redis.keys.list, JSON.stringify(result), function () {
                        next();
                    });
                }
                console.log('[WORKER] send message to upload', message.url);
                uploaderRouter.send('pipe', result);
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

console.log('worker started current process pid is', process.pid);
var args = _.clone(process.argv).splice(2);

helper.createChildProcesses(args, function (err, result) {
    if (err) {
        console.log(err);
        return;
    }

    var uploader = result.uploader,
        generator = result.generator;

    console.log('Generator created pid:', generator.pid);
    console.log('Uploader created pid:', uploader.pid);

    generatorRouter = new ProcessRouter(generator);
    uploaderRouter = new ProcessRouter(uploader);

    generatorRouter.addRoutes(generatorRoutes);

    uploaderRouter.addRoutes({
        log: function (data) {
            console.log('[from uploader]', data);
        }
    });

    var source;

    if (program.queue) {
        var connection = amqp.getConnection(config.amqp.credentials);
        var queues = helper.getQueNames(program, config.amqp);

        console.log('queues', queues);

        var queueStreams = _.values(queues).map(function (queueName) {
            return amqp.getStream({
                queue: queueName,
                exchange: 'amq.direct',
                connection: connection,
                shiftAfterReceive: true
            });
        });

        source = es.merge.apply(es, queueStreams)
            .pipe(stream.log('[RECEIVED:MESSAGE]'))
            .pipe(messageHelper.getMessageParser())
            .pipe(stream.log('[PARSED:MESSAGE]'));

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
    console.log(clc.red('[ERROR IN WORKER]'));
    console.log(clc.red(err));
    console.log(clc.red(err.stack));
    process.kill();
});