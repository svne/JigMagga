'use strict';

process.on('message', function (data) {
    process.send(data);
});
