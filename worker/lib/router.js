'use strict';

var _ = require('lodash'),
    net = require('net');

var LAST_CHUNK_IDENTIFIER = '!!@#$!!';

var LAST_CHUNK_IDENTIFIER_BUFFER = new Buffer(LAST_CHUNK_IDENTIFIER);

/**
 * check if there is the last chunk by checking if there is a LAST_CHUNK_IDENTIFIER
 * in the chunk
 * 
 * @param  {Buffer}  chunk
 * @return {Boolean}
 */
var isLastChunkIn = function (chunk) {
    var length = chunk.length;
    var checkBuffer = chunk.slice(length - LAST_CHUNK_IDENTIFIER_BUFFER.length, length);
    var result = LAST_CHUNK_IDENTIFIER === checkBuffer.toString();
    return result;
};

var removeIdentifier = function (chunk) {
    return chunk.slice(0, chunk.length - LAST_CHUNK_IDENTIFIER_BUFFER.length);
};

/**
 * create a default error handler that could be reassign by creating the error route
 * @param  {Function} err [description]
 */
var defaultErrorHandler = function (err) {
    console.error(err);
};

/**
 * Create an instance of processRouter that allows to create a route for process
 * by assigning a handler to route name via addRoutes method or send a message
 * to the router of other process using send message
 * Route is listening a messages that coming from ipc or pipe channel
 * 
 * @class
 * @param {object} processInstance [description]
 * @param {number} pipeFdNumber    [description]
 */
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

/**
 * Creates a handler for pipe event. Assign listener to the data event of
 * pipe object. Checks if there is a LAST_CHUNK_IDENTIFIER in the incoming buffer
 * if there is no it add this message to the buffer. If the identifier exists it 
 * executes handler with current buffer and clear it after
 * 
 * @private
 * @param  {Function} handler
 */
ProcessRouter.prototype._createPipeHandler = function (handler) {
    var that = this;
    var composedBuffer = new Buffer(0);

    this.pipe.on('data', function (buffer) {
        if (!isLastChunkIn(buffer)) {
            return composedBuffer = Buffer.concat([composedBuffer, buffer]);
        }
        composedBuffer = Buffer.concat([composedBuffer, buffer]);
        var data = removeIdentifier(composedBuffer).toString();
        data = data.split(LAST_CHUNK_IDENTIFIER);
        composedBuffer = new Buffer(0);
        for (var i = 0; i < data.length; i++) {
            handler.call(that, data[i]);
        }
    });
};

/**
 * assign routes object to the existing routes
 * @param {Object.<string, function>} routes
 */
ProcessRouter.prototype.addRoutes = function (routes) {
    if (_.isFunction(routes.pipe)) {
        this._createPipeHandler(routes.pipe);
        delete routes.pipe;
    }

    this.routes = _.assign(this.routes, routes);
};

/**
 * send a message to the process via pipe or ipc
 * if the command is pipe we need to stringify message and add
 * LAST_CHUNK_IDENTIFIER to it
 * 
 * @param  {string} command
 * @param  {*} data
 */
ProcessRouter.prototype.send = function (command, data) {
    if (command === 'pipe') {
        data = _.isString(data) ? data : JSON.stringify(data);
        data = Buffer.concat([new Buffer(data), LAST_CHUNK_IDENTIFIER_BUFFER]);
        return this.pipe.write(data);
    }
    var message = {
        command: command,
        data: data
    };

    this.processInstance.send(message);
};

module.exports = ProcessRouter;