steal('core/control',
    'can/control/route',
    'jquery/event/drag',
    'jquery/event/drag/limit',
    'lib/legacy.js',
    './views/init.ejs',
    function () {
        "use strict";
        var defaultProto = {
                closeLightbox: function (ev) {
                    var self = this;
                    if (this.active) {
                        ev.stopPropagation();
                        this.active = false;
                        this.element.addClass("hidden");
                        $(".yd-inner").css('min-height', '');
                        if (window.location.hash && window.location.hash.length > 2 && window.history.length > 0) {
                            window.setTimeout(function() {
                                if (!self.hash || self.hash === window.location.hash) {
                                    window.history.go(-1);
                                }
                            }, 10);

                        } else {
                            window.location.hash = "";
                        }
                    }
                },
                "{window} click": function (el, ev) {
                    this.closeLightbox(ev);
                },
                "{window} keydown": function (el, ev) {
                    if (ev.keyCode === 27) {
                        this.closeLightbox(ev);
                    }
                },
                ".jig-lightbox-close, .jig-lightbox-small-close click": function (el, ev) {
                    this.closeLightbox(ev);
                },
                ".jig-lightbox-content, .jig-lightbox-small-content click": function (el, ev) {
                    ev.stopPropagation();
                },
                ".jig-lightbox-body, .jig-lightbox-small-body mousedown": function (el, ev) {
                    ev.stopPropagation();
                },
                show: function () {
                    this.element.removeClass('hidden');
                    this.active = true;
                    var $lightbox = this.element.find('.jig-lightbox-content'),
                        $content = $('.yd-content .yd-inner');
                    $lightbox.css({
                        'top': ($(document).scrollTop() + 100) + 'px',
                        'margin-left': -($lightbox.width() / 2)
                    });
                    $content.css('min-height', this.element.find('.jig-lightbox-content').height() + window.pageYOffset + 100);
                },
                close: function (ev) {
                    ev.stopPropagation();
                    this.active = false;
                    this.element.addClass("hidden");
                    $('.yd-content .yd-inner').removeAttr('style');
                }
            };

        if (!jQuery.support.isMobile.any()) {
            var drag = {
                ".jig-lightbox-content, .jig-lightbox-small-content draginit": function (el, ev, drag) {
                    drag.limit($('.yd-content .yd-inner'));
                }
            };
            can.extend(defaultProto, drag);
        }
        //new alert / confirm lightbox
        can.Control.extend('can.Jig.Alert', {
            instances: 0,
            init: function () {
                var $body = this.element,
                    options = this.options,
                    $lightbox = $body.find('.jig-lightbox-small');
                if (!options.html && options.msg && !options.head) {
                    if (options.msg.length > 25) {
                        options.head = options.msg.substring(0, 30) + '...';
                    } else {
                        options.head = options.msg;
                        options.msg = "";
                    }
                }
                can.extend(this, options);
                if ($lightbox.length === 0) {
                    $body.append(can.view("./views/init.ejs", {
                        options: options
                    }));
                } else {
                    $lightbox.html(can.view("./views/init.ejs", {
                        options: options
                    }));
                }
                this.element = $body.find('.jig-lightbox-small');
                this.elementContent = $body.find('.jig-lightbox-small-content');
                this.show();
            },
            show: function (ev) {
                var self = this,
                    winOffsetY = (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
                $('#monetate_htmlLightbox').hide();
                ev && ev.stopPropagation && ev.stopPropagation();
                if (!this.instances) {
                    $(document).bind("focusin.yd-alert", function(e) {
                        if (!self.element.find(e.target).length) {
                            e.preventDefault();
                            self.element.find(".jig-lightbox-small-action").focus();
                        }
                    });
                }
                this.instances++;
                this.element.removeClass("hidden");
                this.element.find(".jig-lightbox-small-action").focus();
                this.active = true;
                this.elementContent.css("top", winOffsetY + 110);
            },
            close: function (ev) {
                ev && ev.stopPropagation && ev.stopPropagation();
                this.active = false;
                this.instances--;
                if (!this.instances) {
                    $(document).unbind("focusin.yd-alert");
                }
                this.element.addClass("hidden");
            },
            ".jig-lightbox-small-content draginit": function (el, ev, drag) {
                drag.limit($('.yd-wrapper'));
            },
            ".jig-lightbox-small-body mousedown": function (el, ev) {
                ev.stopPropagation();
            },
            ".jig-lightbox-small .jig-lightbox-small-action click": function (el, ev) {
                this.close(ev);
                if (typeof this.options.cb === 'function') {
                    this.options.cb(true);
                    this.options.cb = undefined;
                }
            },
            ".jig-lightbox-small .jig-lightbox-small-cancel click": function (el, ev) {
                this.close(ev);
                if (typeof this.options.cb === 'function') {
                    this.options.cb(false);
                    this.options.cb = undefined;
                }
            },
            ".jig-lightbox-small .jig-lightbox-small-close click": function (el, ev) {
                this.close(ev);
                if (typeof this.options.cb === 'function') {
                    this.options.cb(false);
                    this.options.cb = undefined;
                }
            }

        });
        window.alert = function (msg, options) {
            options = options || {};
            options.type = 'alert';
            if (!options.msg) {
                options.msg = msg;
            }
            return new can.Jig.Alert('body', options);
        };
        window.confirm = function (msg, options, cb) {
            if (typeof options === 'function') {
                cb = options;
            }
            options = options || {};
            options.cb = cb;
            options.type = 'confirm';
            if (!options.msg) {
                options.msg = msg;
            }
            return new can.Jig.Alert('body', options);
        };
        can.Jig.Lightbox = function (name, staticObj, protoObj) {
            var proto = can.extend({}, defaultProto, protoObj);
            can.Control.apply(this, [name, staticObj, proto]);
        };
    });