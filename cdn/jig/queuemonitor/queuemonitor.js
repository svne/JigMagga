steal('core/control',
    'cdn/media/css/cdn-core.scss',
    'lib/sockjs.js'
).then(
    'core/mediator',
    './css/queuemonitor.scss',
    function () {
        "use strict";

        /**
              * @class queuemonitor
              */
        can.Control.extend('Cdn.Jig.Queuemonitor',
            /** @Static */
            {
                defaults: {
                    template: "//cdn/jig/queuemonitor/views/init.mustache",
                    i: 0
                }
            },
            /** @Prototype */
            {
                init: function () {
                    var self = this;

                    self.options.queues = can.Mediator;

                    self.element.html(can.view(self.options.template, self.options));
//                    can.Mediator.subscribe("test", "subscriber1", function(val, queue, publisher, time, subscribers) {
//                        console.log("subscriber1", queue, val, publisher, time, subscribers);
//                    });
//                    can.Mediator.subscribe("test", "subscriber2", function(val, queue, publisher, time, subscribers) {
//                        console.log("subscriber2", queue, val, publisher, time, subscribers);
//                    });
//                    can.Mediator.publish("test", "testpublisher", "hallo"));
                },
                "input change": function(el) {
                    var queue = el.val();
                    this.options.queues.openSocket({prefix: "queues"});
                    this.options.queues.bindRoute(queue);
                }
            });
    });
