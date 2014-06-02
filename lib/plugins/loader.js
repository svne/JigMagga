steal("jquery",
    function () {
        "use strict";
        $.fn.ydLoader = function (obj) {
            var color = obj.color,
                start = obj.start,
                stop = obj.stop;
            this.each(function () {
                if (stop) {
                    this.ydLoader = false;
                    $('.yd-loader').html('').removeClass('yd-loader');
                    return;
                }
                if (!this.ydLoader) {
                    this.ydLoader = true;
                    if($.browser.msie && ($.browser.version) < 10){
                        (function ydLoader(loader, color, start) {
                            var el = $(loader),
                                width = el.width(),
                                icons = ["&#xe8cb;", "&#xe8cc;", "&#xe8cd;", "&#xe8ce;", "&#xe8cf;", "&#xe8d0;", "&#xe8d1;", "&#xe8d2;"],
                                speed = 100,
                                min = start ? start : 0,
                                max = icons.length;
                            el.addClass('yd-loader-old').css('font-size', width);
                            if (color) { el.css('color', color); }
                            if (min < max) {
                                setTimeout(function () {
                                    el.html(icons[min])
                                    min++;
                                    ydLoader(loader, color, min);
                                }, speed);
                            } else if (min === max) {
                                ydLoader(loader, color);
                            }
                        })(this, color, start);
                    } else {
                        (function ydLoader(loader, color) {
                            var el = $(loader),
                                elements = 12,
                                loaderClass = 'yd-loader',
                                i;
                            el.addClass(loaderClass);
                            for(i = 1; i <= elements; i++) {
                                el.append('<span class="' + loaderClass + '-' + i + '" style="background:' + color + ';"></span>');
                            }
                        })(this, color, start);
                    }
                }
            });
        }
    }
);