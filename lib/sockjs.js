steal("bower_components/sockjs-client/dist/sockjs.js", "can/map", function () {
    "use strict";

    /**
     * Represents a canJS Map extended by sockJS functionality
     * @constructor
     */
    can.sockJsMap = can.Map.extend({
        socket: null,
        socketBindAttributes: []
    }, {
        /**
         * Open a web socket to a specified route, automatically binds map attributes to sockJS routes
         * @param {object} data - object with the parameters:
         *                        domain - the sockJS domain; default - empty
         *                        port - the port; default - the current port
         *                        prefix - the prefix on the domain; default - empty
         *                        onopen - callback called when socket established
         *                        onmessage - callback called when a message is emmited
         *                        onclose - callback called when the socket is closed down
         */
        openSocket: function (data) {
            var self = this;
            
            data = data || {};
            data.prefix = "/" + (data.prefix || "");
            
            console.log(data.prefix);
            
            self.constructor.socket = new SockJS(data.prefix);
            
            if (typeof data.onopen === "function") {
                self.constructor.socket.onopen = data.onopen;
            }
            
            self.constructor.socket.onmessage = function (message) {
                if (typeof self.publish === "function") {
                    self.publish(message.route, "socket", message.data);
                } else {
                    self[message.route].attr(message.data);
                }
                
                
                if (typeof data.onmessage === "function") {
                    data.onmessage(message);
                }
            };
            
            if (typeof data.onclose === "function") {
                self.constructor.socket.onclose = data.onclose;
            }
        },
        /**
         * close down the socket
         */
        closeSocket: function () {
            this.constructor.socket.close();
            this.constructor.socketBindAttributes = [];
        },
        /**
         * Bind a map attribute to a sockJS route. The attribute name is the route name
         * @param {string} route
         */
        bindRoute: function (route) {
            var self = this;
            if (self.constructor.socketBindAttributes.indexOf(route) === -1) {
                self.constructor.socketBindAttributes.push(route);
                self.constructor.socket.send(JSON.stringify({route: route}));
            }
        }
    });
});
