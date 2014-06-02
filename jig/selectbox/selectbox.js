steal('can/control',
    'yd/core/jQuery/ui/jquery.ui.1.9.1.effect.js',
    function () {
        "use strict";

        can.Control.extend('Yd.Selectbox',
            /** @Static */
            {
                defaults: {}
            },
            /** @Prototype */
            {
                init: function () {
                    this.options.element = this.element;
                    this.on();
                },
                addElements: function (object) {
                    var selectBox = this.element;
                    if (selectBox.hasClass('active')) {
                        this.closeSelect(selectBox);
                    }
                    if (object.length > 0) {
                        var html = '';
                        for (var i = 0, len = object.length; i < len; i++) {
                            html += '<li data-value="' + object[i].value + '" >' + object[i].text + '</li>';
                        }
                        this.element.find('.yd-select-list').html(html);
                        this._setSelected(object[0].value, object[0].text);
                    }
                },
                value: function () {
                    return this.element.data('value');
                },
                getElements: function () {
                    var elements = [];
                    this.element.find('.yd-select-list li').each(function (i, v) {
                        v = $(v);
                        elements.push({
                            value: v.data('value'),
                            text: v.text()
                        });
                    });
                    return elements;
                },
                openSelect: function (el) {
                    var selectList = el.children('.yd-select-list'),
                        selectListH = selectList.children().length * selectList.children().outerHeight(),
                        selectListNewH,
                        top = 0,
                        zIndex = 99;
                    selectList.css('width', el.width() - 2).removeClass('hidden');
                    selectList.children().each(function () {
                        zIndex = zIndex - 1;
                        $(this).css('z-index', zIndex);
                        $(this).animate({
                            top: top
                        }, {
                            duration: 500,
                            easing: 'easeOutQuart'
                        });
                        top = top + $(this).outerHeight();
                    });
                    if (selectListH > 250) {
                        selectListNewH = 250;
                    } else {
                        selectListNewH = selectListH;
                    }
                    selectList.animate({
                        top: selectList.children().height(),
                        height: selectListNewH
                    }, {
                        duration: 500,
                        easing: 'easeOutQuart'
                    });
                    el.addClass('active');
                },
                closeSelect: function (el) {
                    var selectList = el.children('.yd-select-list');
                    selectList.children().each(function () {
                        $(this).animate({
                            top: 0
                        }, {
                            duration: 500,
                            easing: 'easeOutQuart'
                        });
                    });
                    selectList.animate({
                        top: 0,
                        height: 0
                    }, {
                        duration: 500,
                        easing: 'easeOutQuart'
                    });
                    el.removeClass('active');
                },
                "{element} click": function (el, ev) {
                    if (el.hasClass('active')) {
                        this.closeSelect(el);
                    } else {
                        this.openSelect(el);
                    }
                },
                ".yd-select-list li click": function (el, ev) {
                    this._setSelected(el.data('value'), el.text());
                },
                _setSelected: function (value, text) {
                    this.element.data('value', value);
                    this.element.children('.yd-select-label').text(text);
                    this.element.trigger('change', [value, text]);
                },
                "{window} click": function (el, ev) {
                    var selectBox = this.element;
                    if (!selectBox.has(ev.target).length) {
                        this.closeSelect(selectBox);
                    }
                }
            });
    }
);
