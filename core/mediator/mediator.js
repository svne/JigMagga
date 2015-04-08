steal("can/construct", "can/map", function () {
    "use strict";
    
     /**
     * Represents a mediator by extending the canJS Map
     * @constructor
     */
    var Mediator = can.Map.extend({
        handlers: {},
        monitorMethod: undefined,
        monitorCallback: []
    }, {
        /**
         * Subscribe "subscriber" to a queue using a callback
         * @param {string} queueName - the queue name
         * @param {string} subscriber - the subscriber
         * @param {function} cb - the callback function
         * @returns {can.Map}
         */
        subscribe: function subscribe (queueName, subscriber, cb) {
            var self = this;
            if (typeof queueName !== "string") {
                throw new Error("Queue name must be string");
            }
            if (typeof subscriber !== "string") {
                throw new Error("Subscriber name must be string");
            }
            if (typeof self.attr(queueName) !== "undefined") {
                if (self.attr(queueName).subscribers && self.attr(queueName).subscribers.indexOf(subscriber) !== -1) {
                    throw new Error("Subscriber already subscribed");
                }
                if (typeof cb === "function" && self.attr(queueName).publisher) {
                    self._callbackQueue(queueName, cb);
                }
                self[queueName].subscribers.push(subscriber);
            } else {
                self.attr(queueName, {subscribers: [subscriber]});
                self._addmonitorQueue(queueName);
            }
            
            if (typeof cb === "function") {
                self.constructor.handlers[subscriber] = function (ev, val) {
                    self._callbackQueue(queueName, cb);
                };
                self[queueName].bind("time", self.constructor.handlers[subscriber]);
            }
            return self[queueName];
        },
        /**
         * Unsubscribe "subscriber" from a queue
         * @param {string} queueName - the queue name
         * @param {string} subscriber - the subscriber
         */
        unsubscribe: function (queueName, subscriber) {
            if (this.constructor.handlers[subscriber] && this[queueName]) {
                this[queueName].unbind("time", this.constructor.handlers[subscriber]);
                delete this.constructor.handlers[subscriber];
            } else if (!this.constructor.handlers[subscriber]) {
                throw new Error("No handler found for this subscriber");
            } else {
                delete this.constructor.handlers[subscriber];
            }
        },
        /**
         * Publish a value to a queue
         * @param {string} queueName - the queue name
         * @param {string} publisher- the publisher name writing to the queue
         * @param value - a value of any type
         */
        publish: function (queueName, publisher, value) {
            var self = this;
            if (typeof queueName !== "string") {
                throw new Error("Queue name must be string");
            }
            if (typeof publisher !== "string") {
                throw new Error("Publisher name must be string");
            }
            if (typeof self[queueName] === "undefined") {
                self.attr(queueName, {"subscribers": []});
                self._addmonitorQueue(queueName);
            }
            self[queueName].attr("publisher", publisher);
            self[queueName].attr("value", value);
            self[queueName].attr("time", new Date());
        },
        /**
         * Monitor all queues or one single queue. The vaules get sent to a callback function or are logged to the console
         * @param {function|string} cb - the callback function or the queue name
         */
        monitor: function (cb) {
            var self = this,
                selfArr;
            if (typeof cb === "string") {
                self[cb].bind("time", function () {
                    self._logQueue(cb);
                });
            } else {
                if (typeof cb === "function") {
                    self.constructor.monitorCallback.push(cb);
                    self.constructor.monitorMethod = "_callbackQueue";
                } else {
                    self.constructor.monitorMethod = "_logQueue";
                }
                selfArr = self.__get();
                for (var queueName in selfArr) {
                    if (selfArr.hasOwnProperty(queueName)) {
                        self[queueName].bind("time", function () {
                            self[self.constructor.monitorMethod](queueName, self.constructor.monitorCallback);
                        });
                    }
                }
            }
        },
        /**
         * Helper method to bind all eisting monitors to new queues
         * @param {string} queueName - the queue name
         * @private
         */
        _addmonitorQueue: function (queueName) {
            var self = this;
            if (self.constructor.monitorMethod) {
                if (self.constructor.monitorCallback.length) {
                    can.each(self.constructor.monitorCallback, function(cb) {
                        self[queueName].bind("time", function () {
                            self[self.constructor.monitorMethod](queueName, cb);
                        });
                    });
                } else {
                    self[queueName].bind("time", function () {
                        self[self.constructor.monitorMethod](queueName);
                    });
                }
            }
        },
        /**
         * Get all queue names
         * @returns {array}
         */
        getAllQueues: function () {
            return can.Map.keys(this);
        },
        /**
         * Writes all queue data to the callback funktion
         * @param {string} queueName - the queue name
         * @param {function} cb - the callback function
         * @private
         */
        _callbackQueue: function(queueName, cb) {
            cb(this.attr(queueName).value, queueName, this.attr(queueName).publisher, this.attr(queueName).time, this.attr(queueName).subscribers.attr());
        },
        /**
         * Writes all queue data to the console
         * @param {string} queueName - the queue name
         * @param _cb - not used
         * @private
         */
        _logQueue: function(queueName, _cb) {
            if (typeof console !== "undefined" && console.log) {
                console.log("JM Mediator - Queue:", queueName, ", Value:", this.attr(queueName).value, ", Publisher:", this.attr(queueName).publisher, ", Time:", this.attr(queueName).time, ", Subscribers:", this.attr(queueName).subscribers.attr());
            }
        }
    });

    /**
     * Instantiate the Mediator in the canJS namespace
     * @type {Mediator}
     */
    can.Mediator = new Mediator({});

});
