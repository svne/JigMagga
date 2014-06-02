steal("jquery",  "can/util", function () {
    /*
     * Placeholder to label
     * @class Placeholder
     * @parent Library
     * @constructor
     * Placeholder constructor
     * @author Toni Meuschke <meuschke@lieferando.de>
     *
     */
    (function ($) {
        var ydPlaceholderdefaults = {
                label: '<label></label>'
            },
            hasPlaceholder = 'placeholder' in document.createElement('input');
        if (!hasPlaceholder) {
            $('body').addClass('yd-placeholder-fallback-body');
        }
        $.fn.ydPlaceholder = function (options) {
            var options = $.extend({}, ydPlaceholderdefaults, options);
            return (hasPlaceholder) ? this : this.each(function () {
                var $this = $(this),
                    placeholderText = $this.attr('placeholder'),
                    label = $(options.label),
                    inputId = (this.id) ? this.id : 'placeholder' + (Math.floor(Math.random() * 1123456789));
                if (placeholderText && !this.placeholderInit) {
                    this.placeholderInit = true;
                    label.attr({"for" : inputId, "class" : $this.attr("name") ? "yd-placeholder-" + $this.attr("name") : null}).text(placeholderText);
                    $this.parent().addClass('yd-cf');
                    $this.attr('id', inputId).wrap('<div></div>').before(label);
                    $this.parent().addClass('yd-placeholder-fallback');
                }
            });
        };
    })(jQuery);
    /*
     * Normal Placeholder fallback
     * @class Placeholder
     * @parent Library
     * @constructor
     * Placeholder constructor
     * @author Toni Meuschke <meuschke@lieferando.de>
     *
     */
    $.fn.ydPlaceholderOLD = function () {
        return this.each(function () {
            var that = this,
                $that = $(that);
            if (!jQuery.support.placeholder && $that.attr('placeholder')) {
                if ($that.val().replace(' ', '') === '') {
                    $that.val($that.attr('placeholder'));
                }
                $that.unbind('placeholder').bind('focus.placeholder', function () {
                    if ($that.val() === $that.attr('placeholder')) {
                        $that.val('');
                    }
                });
                $that.unbind('placeholder').bind('blur.placeholder', function () {
                    if ($that.val().replace(' ', '') === '') {
                        $that.val($that.attr('placeholder'));
                    }
                });
            }
        });
    };
});