'use strict';

var _ = require('lodash'),
    net = require('net');

var LAST_CHUNK_IDENTIFIER = '!!@#$!!';

var regExp = new RegExp('!!@#\\$!!$', 'ig');

var isLastChunkIn = function (chunk) {
    return regExp.test(chunk);
};

var defaultErrorHandler = function (err) {
    console.error(err);
};

var ProcessRouter = function (processInstance, pipeFdNumber) {
    var that = this;

    pipeFdNumber = pipeFdNumber || 3;

    this.processInstance = processInstance;
    this.routes = {error: defaultErrorHandler};
    this._isParent = _.isArray(this.processInstance.stdio);
    this.pipe = (this._isParent) ? this.processInstance.stdio[pipeFdNumber] : new net.Socket({fd: pipeFdNumber});

    this.processInstance.on('message', function (data) {
        var routeHandler = that.routes[data.command];

        if (!_.isFunction(routeHandler)) {
            return that.routes.error.call(that, 'there is no handler for command: ' + data.command);
        }

        routeHandler.call(that, data.data);

    });
};


ProcessRouter.prototype._createPipeHandler = function (handler) {
    var that = this,
        buffer = '';

    this.pipe.on('data', function (buf) {
        var data = buf.toString(),
            messages;
        buffer += data;
        if (isLastChunkIn(buffer)) {
            messages = _.compact(buffer.split(LAST_CHUNK_IDENTIFIER));
            for  (var i = 0; i < messages.length; i++) {
                handler.call(that, messages[i]);
            }
            buffer = '';
            messages = [];
        }
    });
};

ProcessRouter.prototype.addRoutes = function (routes) {
    if (_.isFunction(routes.pipe)) {
        this._createPipeHandler(routes.pipe);
        delete routes.pipe;
    }

    this.routes = _.assign(this.routes, routes);
};

ProcessRouter.prototype.send = function (command, data) {
    if (command === 'pipe') {
        data = _.isString(data) ? data : JSON.stringify(data);
        data += LAST_CHUNK_IDENTIFIER;
        return this.pipe.write(new Buffer(data));
    }
    var message = {
        command: command,
        data: data
    };

    this.processInstance.send(message);
};

module.exports = ProcessRouter;
