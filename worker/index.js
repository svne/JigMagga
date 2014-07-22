#! /usr/local/bin/node
'use strict';

var konphyg = require('konphyg')(__dirname + '/config'),
    _ = require('lodash'),
    es = require('event-stream'),
    path = require('path'),
    program = require('commander');

var amqp = require('./lib/amqp'),
    ProcessRouter = require('./lib/router'),
    configMerge = require('./lib/configMerge'),
    messageHelper = require('./lib/message'),
    helper = require('./lib/helper');

var config = konphyg.all();

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
    .option('-I, --locale', 'use given locale')
    .parse(process.argv);


var basePath = (program.args[0]) ? path.join(process.cwd(), program.args[0]) : process.cwd();

var pageConfigPath = path.join(basePath, 'page');

var connection = amqp.getConnection(config.amqp.credentials);
var queues = helper.getQueNames(program, config.amqp);

console.log('queues', queues);

var generator = helper.createSubProcess(__dirname + '/generator/index.js');

var generatorRouter = new ProcessRouter(generator);

generatorRouter.addRoutes({
    log: function (data) {
        console.log('from generator', data);
    },
    pipe: function (data) {
        console.log('message from pipe');
    }
});

var queueStreams = _.values(queues).map(function (queueName) {
    return amqp.getStream({
        queue: queueName,
        exchange: 'amq.direct',
        connection: connection,
        shiftAfterReceive: true
    });
});

var isDomainInSkipList = function (domain) {
    return config.main.skipDomains.indexOf(domain) >= 0;
};

var isMessageFormatCorrect = function (message) {
    return (message.basedomain && !isDomainInSkipList(message.basedomain)) &&
        ((message.url && message.page) || (!message.url && !message.page));
};

es.merge.apply(es, queueStreams)
    .pipe(helper.streamLog('[NEW:MESSAGE]'))
    .pipe(messageHelper.getMessageParser())
    .pipe(helper.streamLog('[PARSED:MESSAGE]'))
    .pipe(helper.streamFilter(function (data) {
        if (!isMessageFormatCorrect(data.message)) {
            console.error('something wrong with message fields');
            return false;
        }
        return true;
    }))
    .pipe(helper.streamLog('[FILTERED:MESSAGE]'))
    .pipe(configMerge.getDomainConfigStream(pageConfigPath))
    .pipe(messageHelper.getSplitter())
    .pipe(es.through(function (data) {
        console.log('[SPLITTER]', data.message);
        this.emit('data', data);
    }))
    .pipe(es.through(function (message) {
        this.emit('data', messageHelper.createMessage(message.message, program, message.config));
    }))
    .on('data', function (data) {
        generatorRouter.send('new:message', data);
        generatorRouter.send('pipe', 'message to Pipe');
    });

