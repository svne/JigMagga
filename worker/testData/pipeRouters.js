'use strict';

var Router = require('../lib/router');

var router = new Router(process);

router.addRoutes({
    pipe: function (data) {
        this.send('pipe', data);
    }
});
