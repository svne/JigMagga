'use strict';

var Router = require('../lib/router');

var router = new Router(process);

router.addRoutes({
    pipe: function (data) {
        console.log('[subProcess]', data);

        this.send('pipe', data);
    }
});
