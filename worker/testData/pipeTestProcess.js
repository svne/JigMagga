'use strict';

var net = require('net');

var pipe = net.Socket({fd: 3});

pipe.on('data', function (data) {
    pipe.write(data);
});