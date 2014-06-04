steal('can/control', './css/text.scss', function () {
    "use strict";

    /**
          * @class Yd.Jig.Servicetext.Text
          */
    can.Control.extend('can.Jig.Headline',
        /** @Static */
        {
            defaults: {}
        },
        /** @Prototype */
        {
            init: function () {
                this.element.html(can.view(this.options.template, {}));
            }
        });
});