'use strict';

var configMerge = require('../lib/configMerge'),
    ProcessRouter = require('../lib/router');

var router = new ProcessRouter(process);

router.addRoutes({
    'new:message': function (data) {
        this.send('log', {data: data, msg: 'data obtained'});
    },
    pipe: function (data) {
//        this.send('log', {msg: 'got some data from pipe', data: data});

//        this.send('pipe', data);
    }
});
