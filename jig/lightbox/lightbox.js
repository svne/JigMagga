steal(
    'can/control',
    'jquery/event/drag',
    'can/construct/super',
    function () {
        "use strict";
        /**
         * @class Jig.Lightbox
         */
        can.Control.extend('Jig.Lightbox',
            /** @Static */
            {
                defaults: {
                    view: "./views/small.ejs",
                    removeElementAtClose: true,
                    dragAllow: true,
                    viewOptions: {},
                    viewHelper: {}
                }
            },
            /** @Prototype */
            {
                setup: function (element, options) {
                    if (!element && options && options.element && options.append) {
                        element = $(options.element);
                        $(options.append).append(element);
                    }
                    can.Control.prototype.setup.apply(this, [element, options]);
                },
                init: function () {
                    var self = this;
                    self.element.html(can.view(self.options.view, {options: self.options.viewOptions}, self.options.viewHelper));
                    self.dragInit();
                    self.initCSS();
                    self.isOpen = true;
                },
                /**
                 * this will init a view with his data and helpers and init the lightbox
                 * @param view
                 * @param data
                 * @param helper
                 */
                initWithViewAndOptions: function (view, data, helper) {
                    var self = this;
                    self.options.view = view;
                    self.options.viewOptions = data || {};
                    self.options.viewHelper = helper || {};
                    //call prototype init
                    Jig.Lightbox.prototype.init.apply(this, []);
                },
                "{window} click": function (el, ev) {
                    if (this.options.button && !$(ev.target).parents(this.options.button).length) {
                        this.close(ev);
                    }
                },
                dragInit: function () {
                    var self = this,
                        contentInner;
                    if (!$.support.isMobile.any() && !($.browser.msie && $.browser.version < 10) && self.options.dragAllow) {
                        $(".jig-lightbox-content, .jig-lightbox-small-content", self.element).on('draginit', function (ev, drag) {
                            if (ev.target && $(ev.target).hasClass("jig-lightbox-head")) {
                                if (self.options && self.options.dragLimit) {
                                    drag.limit($(self.options.dragLimit));
                                } else {
                                    contentInner = $('.content-user').length > 0 ? $(".content-user .inner") : $(".content .inner");
                                    drag.limit(contentInner);
                                }
                            } else {
                                //HACK drag.cancel() do not work
                                drag._cancelled = true;
                                drag.selection();
                            }
                        });
                    }
                },
                "{window} keydown": function (el, ev) {
                    if (ev.keyCode === 27) {
                        this.close(ev);
                    }
                },
                ".jig-lightbox-close, .jig-lightbox-small-close click": function (el, ev) {
                    this.close(ev);
                },
                ".jig-lightbox-content, .jig-lightbox-small-content click": function (el, ev) {
                    ev.stopPropagation();
                },
                ".jig-lightbox-body, .jig-lightbox-small-body mousedown": function (el, ev) {
                    ev.stopPropagation();
                },
                initCSS: function () {
                    var $lightbox = this.element.find('.jig-lightbox-content'),
                        contentInner;
                    $lightbox.css({
                        'top': ($(document).scrollTop() + 100) + 'px',
                        'margin-left': -($lightbox.width() / 2)
                    });
                    if ($lightbox.length > 0) {
                        contentInner = $('.content-user').length > 0 ? $(".content-user .inner") : $(".content .inner");
                        contentInner.css('min-height', this.element.find('.jig-lightbox-content').height() + (typeof window.pageYOffset === "number" ? window.pageYOffset : 0 ) + 300);
                    }
                },
                close: function (ev) {
                    ev ? ev.stopPropagation() : null;
                    if (this.options.removeElementAtClose) {
                        this.element.remove();
                    } else {
                        this.element.html("");
                    }
                    $(".inner").css('min-height', '');
                    if (this.options.removeElementAtClose) {
                        this.destroy();
                    }
                    this.isOpen = false;
                }
            });
    }
);
