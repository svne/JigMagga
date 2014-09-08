var module = module || {};
module.exports = module.exports || {};
if (typeof window === 'undefined') {
    window = this;
}

window.ydViewHelper = module.exports = {
    currency: function (value) {
        return value ? (value / 100).toFixed(2).toString().split('.').join(',') : "0,00";
    },
    pagination: function (path, subPath, max, current) {
        var elements = [],
            element,
            i,
            l,
            visibleStart = 1,
            visibleOffset = 2,
            visibleEnd = visibleStart + visibleOffset * 2,
            invisibleMax = 10,
            invisibleCount = 0;

        max = Math.ceil(max);
        path = path || "";
        subPath = subPath || [];

        for (i = 1, l = subPath.length; i < l; i++) {
            if (i < l - 1 || isNaN(subPath[i].url)) {
                path += "/" + _(subPath[i].url);
            } else if (!current) {
                current = parseInt(subPath[i].url);
            }
        }

        elements.push({title: _("yd-core-page-first"), path: path, visible: true});
        if (current > visibleOffset) {
            if (max - current < visibleOffset) {
                visibleStart = max - visibleOffset * 2;
            } else {
                visibleStart = current - visibleOffset;
            }
            visibleEnd = visibleStart + visibleOffset * 2;
        }
        for (i = 1; i < max + 1; i++) {
            element = {title: _("yd-core-page", i)};
            if (i > 1) {
                element.path = path + "/" + i;
            } else {
                element.path = path;
            }
            if (i === current) {
                element.current = true;
            }
            if ((i === 1 && visibleStart > 1) || i === visibleEnd + 1) {
                element.invisibleStart = true;
                invisibleCount = 0;
            }
            if (i === visibleStart - 1 || (i === max && visibleEnd < max
                ) || invisibleCount === invisibleMax - 1) {
                element.invisibleEnd = true;
            }
            if (i < visibleStart || i > visibleEnd) {
                element.visible = false;
                invisibleCount++;
            } else {
                element.visible = true;
            }
            if (i === visibleStart) {
                element.visibleStart = true;
            }
            if (i === visibleEnd) {
                element.visibleEnd = true;
            }
            if (element.visible || invisibleCount <= invisibleMax) {
                elements.push(element);
            }
        }
        elements.push({title: _("yd-core-page-last"), path: element.path, visible: true});
        return elements;
    },
    getCurrentPageType: function() {
        this.steal = typeof steal === "undefined" ? this.steal : steal;
        this.Yd = typeof Yd === "undefined" ? this.Yd : Yd;

        if (this.steal && this.steal.config().env === 'development') {
            page = $("body") && $("body").data && $("body").data("pagename") && $("body").data("pagename").toString();
        } else {
            page = this.Yd.predefined && this.Yd.predefined.pageType || this.pageType || typeof pageType !== "undefined" && pageType;
        }
        return page;
    },
    languageAlternatives: function() {
        var page,
            alternatives = [],
            locale,
            url = "";
        this.steal = typeof steal === "undefined" ? this.steal : steal;
        this.Yd = typeof Yd === "undefined" ? this.Yd : Yd;

        if (this.steal && this.steal.config().env === 'development') {
            page = $("body") && $("body").data && $("body").data("pagename") && $("body").data("pagename").toString();
            if (!this.Yd.config.pages[page]) {
                page = "static/" + page;
            }
        } else {
            page = this.Yd.predefined && this.Yd.predefined.pageType || this.pageType || typeof pageType !== "undefined" && pageType;
            url = this.Yd.predefined && this.Yd.predefined.url || this.url || typeof url !== "undefined" && url;
        }
        if (this.Yd.config.pages[page]) {
            for (locale in this.Yd.config.pages[page]) {
                if (this.Yd.config.pages[page].hasOwnProperty(locale) && this.Yd.config.locales.indexOf(locale) !== -1) {
                    alternatives.push({"locale": locale, "url": this.Yd.config.pages[page][locale].replace("{url}", url), "label": this.getLocaleLabel(locale)});
                }
            }
        }
        return alternatives.length > 1 ? alternatives : undefined;
    },
    getLocaleLabel: function (locale) {
        locale = locale || Yd.config.locale;
        switch(locale) {
            case "de_DE":
                return _("yd-core-locale-de_DE");
            case "nl_NL":
                return _("yd-core-locale-nl_NL");
            case "fr_FR":
                return _("yd-core-locale-fr_FR");
            case "de_AT":
                return _("yd-core-locale-de_AT");
            case "de_CH":
                return _("yd-core-locale-de_CH");
            case "nl_BE":
                return _("yd-core-locale-nl_BE");
            case "pl_PL":
                return _("yd-core-locale-pl_PL");
            case "es_ES":
                return _("yd-core-locale-es_ES");
            case "it_IT":
                return _("yd-core-locale-it_IT");
            case "tr_TR":
                return _("yd-core-locale-tr_TR");
            default:
                return _("yd-core-locale-en_EN");
        }
    },
    isMainLocale: function () {
        var locale;

        this.Yd = typeof Yd === "undefined" ? this.Yd : Yd;

        locale = this.Yd.predefined.locale || this.Yd.config.locale;

        return typeof locale === "undefined" || !this.Yd.config.locales || locale === this.Yd.config.locales[0];
    },
    /**
     * Replace a relative link with is current local path and return it absolute
     * @param link -> the relativ link
     * @param targetUrl -> will be replace the placeolder in config.pages
     * @param locale -> the current local that is used
     * @returns {*}
     */
    pageLink: function (link, targetUrl, locale) {
        var resultUrl,
            key;

        this.steal = typeof steal === "undefined" ? this.steal : steal;
        this.Yd = typeof Yd === "undefined" ? this.Yd : Yd;

        locale = locale || this.Yd.config.locale;

        if (!this.Yd.config.pages[link]) {
            for (key in this.Yd.config.pages) {
                if (key.indexOf("/" + link) !== -1) {
                    link = key;
                }
            }
        }

        if (this.steal && this.steal.config().env === 'development') {
            resultUrl = location.pathname.replace(/(.*\.[a-z]{2,3}\/).*/, "$1" + link + "/" + link.replace(/^.*\//, "") + ".html");
        } else if (this.Yd.config.pages[link]) {
            if (this.Yd.config.pages[link][locale]) {
                resultUrl = this.Yd.config.pages[link][locale];
            } else {
                resultUrl = this.Yd.config.pages[link][Object.keys(this.Yd.config.pages[link])[0]];
            }
            if (targetUrl) {
                resultUrl = resultUrl.replace("{url}", targetUrl);
            }
        }
        return resultUrl;
    },
    childPageLink: function(childUrl) {
        var page,
            targetUrl = "";

        this.steal = typeof steal === "undefined" ? this.steal : steal;
        this.Yd = typeof Yd === "undefined" ? this.Yd : Yd;

        if ((!this.steal || this.steal.config().env !== 'development') && childUrl) {
            return "/" + _(childUrl);
        }

        if (this.steal && this.steal.config().env === 'development') {
            page = $("body") && $("body").data && $("body").data("pagename") && $("body").data("pagename").toString();
        } else {
            page = this.Yd.predefined && this.Yd.predefined.pageType || this.pageType || typeof pageType !== "undefined" && pageType;
            targetUrl = this.Yd.predefined && this.Yd.predefined.url || this.url || typeof url !== "undefined" && url;
        }

        return this.pageLink(page, targetUrl);
    },
    staticLink: function (link, locale) {
        return this.pageLink(link, undefined, locale);
    },
    staticLinkTag: function (link, activeClass, extraClass) {
        var finalLink = this.staticLink(link),
            finalLinkRegex = new RegExp("\\b" + finalLink + "\\b"),
            string = '<a href="' + finalLink + '" class="';
        this.url = "/" + (typeof url === "undefined" ? this.url || window.location.href : url
            );
        if (this.url.search(new RegExp("\\b" + link + "\\b")) > -1 || this.url.search(finalLinkRegex) > -1) {
            string += activeClass + (typeof extraClass !== "undefined" ? " " + extraClass : ""
                );
        } else {
            string += extraClass;
        }
        string += '">';
        return string;
    },
    staticLinkTagChildren: function (link, title, activeClass, children) {
        var finalLink = this.staticLink(link),
            string = '<a href="' + finalLink + '" class="',
            childrenString = "",
            childrenActive = false,
            active = false,
            childLink,
            finalChildLink;
        this.url = "/" + (typeof url === "undefined" ? this.url || window.location.href : url
            );
        if (children) {
            for (childLink in children) {
                if (children.hasOwnProperty(childLink)) {
                    finalChildLink = this.staticLink(childLink);
                    childrenString += '<li><a href="' + finalChildLink + '" class="';
                    if (this.url.search(childLink+"$") > -1 || this.url.search(finalChildLink) > -1) {
                        childrenString += activeClass;
                        childrenActive = true;
                    }
                    childrenString += '">' + children[childLink] + '</a></li>';
                }
            }
        }
        if (childrenActive || this.url.search(link) > -1 || this.url.search(finalLink) > -1) {
            string += activeClass;
            active = true;
        }
        string += '">' + title + '</a>';
        if (children) {
            string += '<ul class="' + (active ? "active" : "hidden"
                ) + '">' + childrenString + "</ul>";
        }

        return string;
    },
    dataAttributeJson: function (value) {
        var string;
        if (typeof JSON !== 'undefined' && JSON.stringify) {
            string = JSON.stringify(value);
        } else {
            string = JSON.stringify(value);
        }
        return string;
    },
    qualityStarsPercent: function (value) {
        return value ? Math.round(parseFloat(value) * 20) : "0";
    },
    advicePercent: function (restaurant) {
        restaurant.ratingAdviceCount = restaurant.ratingAdviceCount ? restaurant.ratingAdviceCount : 0;

        return Math.round(restaurant.ratingAdviceCount /
            Math.max(restaurant.ratingCount, 1) * 100);
    },
    product: function (var1, var2) {
        return Math.round((var1 || 0
            ) / (var2 || 1
            ) * 100);
    },
    adviceBoxBackground: function (restaurant) {
        var ratingRatio = (restaurant.ratingAdviceCount || 0
                ) / (restaurant.ratingCount || 1
                ),
            adviceBoxClass = '';
        if (ratingRatio < 0.5 && ratingRatio >= 0.2) {
            adviceBoxClass = "yd-jig-ratings-overview-percent-yellow";
        } else if (ratingRatio < 0.2) {
            adviceBoxClass = "yd-jig-ratings-overview-percent-red";
        }
        return adviceBoxClass;
    },
    allOpeningsStrings: function (openings, labelWeekdays) {
        var openingsStrings = {},
            openingsStringsDays = {},
            openingsSorted = [],
            openingsStringsFinal = [],
            openingString,
            day,
            lastDay,
            i,
            l,
            v,
            untilCount,
            vNext,
            weekdaysShort = [
                _("yd-jig-serviceinfo-openings-su"),
                _("yd-jig-serviceinfo-openings-mo"),
                _("yd-jig-serviceinfo-openings-tu"),
                _("yd-jig-serviceinfo-openings-we"),
                _("yd-jig-serviceinfo-openings-th"),
                _("yd-jig-serviceinfo-openings-fr"),
                _("yd-jig-serviceinfo-openings-sa"),
                _("yd-jig-serviceinfo-openings-su")
            ],
            weekdaysFull = [
                '<span>' + _("yd-jig-serviceinfo-openings-su-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-mo-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-tu-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-we-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-th-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-fr-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-sa-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-su-full") + '</span>'
            ],
            weekdays = labelWeekdays === 'full' ? weekdaysFull : weekdaysShort;

        for (i = 0, l = openings.length; i < l; i++) {
            if (openings[i].day !== 10) {
                openingsSorted.push({
                    day : openings[i].day === 0 ? 7 : openings[i].day,
                    from : openings[i].from,
                    until : openings[i].until
                });
            }
        }
        for (i = 0, l = openingsSorted.length; i < l; i++) {
            v = openingsSorted[i];
            if (i < l) {
                vNext = openingsSorted[i + 1];
            } else {
                vNext = openingsSorted[0];
            }
            if (vNext && (vNext.day !== v.day + 1 && (vNext.day !== 0 || v.day !== 7
                )
                )) {
                vNext = undefined;
            }
            if (openingsStrings[v.day]) {
                openingsStrings[v.day] += _("yd-jig-serviceinfo-openings-and");
            } else {
                openingsStrings[v.day] = "";
            }
            if (vNext && v.until === "00:00" && vNext.from === "00:00") {
                openingsStrings[v.day] += _("yd-jig-serviceinfo-openings-from-tomorrow", v.from, vNext.until);
                if (i < l) {
                    i++;
                } else {
                    i = 0;
                }
            } else {
                openingsStrings[v.day] += _("yd-jig-serviceinfo-openings-from-until", v.from, v.until);
            }
        }
        for (day in openingsStrings) {
            if (!openingsStringsDays[openingsStrings[day]]) {
                openingsStringsDays[openingsStrings[day]] = [];
            }
            openingsStringsDays[openingsStrings[day]].push(parseInt(day));
        }
        for (openingString in openingsStringsDays) {
            lastDay = undefined;
            untilCount = 0;
            for (i = 0, l = openingsStringsDays[openingString].length; i < l; i++) {
                if (!lastDay) {
                    day = weekdays[openingsStringsDays[openingString][i]];
                } else {
                    if (openingsStringsDays[openingString][i] === lastDay + 1) {
                        untilCount++;
                    } else {
                        if (untilCount) {
                            day += (untilCount > 1 ? " - " : ", "
                                ) + weekdays[lastDay];
                        }
                        untilCount = 0;
                        day += ", " + weekdays[openingsStringsDays[openingString][i]];
                    }
                }
                lastDay = openingsStringsDays[openingString][i];
            }
            if (untilCount) {
                day += (untilCount > 1 ? " - " : ", "
                    ) + weekdays[lastDay];
            }
            openingsStringsDays[openingString] = day;
        }
        for (day in openingsStrings) {
            if (openingsStringsFinal.indexOf(openingsStringsDays[openingsStrings[day]] + " " + openingsStrings[day]) === -1) {
                openingsStringsFinal.push(openingsStringsDays[openingsStrings[day]] + " " + openingsStrings[day]);
            }
        }

        return openingsStringsFinal;
    },
    allOpeningsStringsFull: function(openings) {
        var openingsFinal = [
                '<span>' + _("yd-jig-serviceinfo-openings-su-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-mo-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-tu-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-we-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-th-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-fr-full") + '</span>',
                '<span>' + _("yd-jig-serviceinfo-openings-sa-full") + '</span>'
            ],
            lastDay,
            i;

        openings.sort(function(a, b) {
            a = a.day + a.from;
            b = b.day + b.from;
            return a === b ? 0 : (a < b ? -1 : 1);
        });
        for (i = 0; i < openings.length; i++) {
            if (openingsFinal[openings[i].day]) {
                openingsFinal[openings[i].day] += (lastDay === openings[i].day ? ", " : " ") + openings[i].from + " - " + openings[i].until;
            }
            lastDay = openings[i].day;
        }
        openingsFinal.push(openingsFinal[0]);
        openingsFinal.shift();
        return openingsFinal;
    },
    allOpeningsItemprop: function (openings) {
        "use strict";
        var openingsStrings = [],
            weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
            i = 0,
            l;
        for (l = openings.length; i < l; i++) {
            if (weekdays[openings[i].day]) {
                openingsStrings.push(weekdays[openings[i].day] + " " + openings[i].from + "-" + openings[i].until);
            }
        }
        return openingsStrings.join(", ");
    },
    getAttr: function (name, object) {
        var nameelement = object[name];
        if (nameelement && typeof nameelement === "string") {
            //noinspection JSLint
            return nameelement;
        } else {
            return "";
        }
    },
    getStringListElements: function (name, object, count, splitChar) {
        var nameList,
            nameelement = object[name];
        if (nameelement && typeof nameelement === "string") {
            count = count || 3;
            splitChar = splitChar || ",";
            nameList = nameelement.split(splitChar);
            nameelement = nameList.splice(0, count).join(", ");
            //noinspection JSLint
            return nameelement;
        } else {
            return "";
        }
    },
    getCost: function (name, object) {
        var mincost = "0,00";
        if (typeof object[name] !== "undefined") {
            mincost = parseFloat(object[name] / 100).toFixed(2);
        } else if (object.areas && object.areas[0] && typeof object.areas[0][name] !== "undefined") {
            mincost = parseFloat(object.areas[0][name] / 100).toFixed(2);
        }
        if (isNaN(mincost)) {
            return "0,00";
        }
        return mincost.toString().replace(/\./, ",");
    },
    getMinMincostFromArea : function(areas){
        var minMincost = undefined;
        if(areas && areas[0]){
         for(var i = 0, len = areas.length; i < len ; i++){
             minMincost = minMincost === undefined ? areas[i].mincost : minMincost;
             minMincost = minMincost > areas[i].mincost ? areas[i].mincost : minMincost;
         }
        }
        return minMincost;
    },
    getMinDelivercostFromArea : function(areas){
        var delivercost = undefined;
        if(areas && areas[0]){
            for(var i = 0, len = areas.length; i < len ; i++){
                delivercost = delivercost === delivercost ? areas[i].delivercost : delivercost;
                delivercost = delivercost > areas[i].delivercost ? areas[i].delivercost : delivercost;
            }
        }
        return delivercost;
    },
    findById: function (id, array) {
        var i,
            l;
        if (array && id !== undefined) {
            for (i = 0, l = array.length; i < l; i++) {
                if (array[i].id && parseInt(array[i].id, 10) === parseInt(id, 10)) {
                    return array[i];
                }
            }
        }
        return {};
    },
    discountCaptionString : function(discount, warn) {
        var warningWording = _('yd-jig-discount-title-warn'),
            warningWordingStamps = _('yd-jig-discount-title-warn-stamps');
        if(!discount) {
            return _("yd-jig-discount-init-nopartner");
        }
        var amount = discount.kind === 0 ? discount.rabatt + "%" : window.ydViewHelper.currency(discount.rabatt) + _("yd-core-currency");
        if (discount.newCustomer) {
            if (discount.exclusive) {
                return warn ? _('yd-jig-partnerdiscount-exclusive-new', amount) + " " + warningWording : _('yd-jig-partnerdiscount-exclusive-new', amount);
            } else {
                return warn ? _('yd-jig-partnerdiscount-new', amount) + " " + warningWording : _('yd-jig-partnerdiscount-new', amount);
            }
        } else if(discount.discountType === "stp"){
            if(discount.stpId){
                return warn ? warningWordingStamps : _('yd-jig-checkout-discount-stampcard-full-heading', window.ydViewHelper.currency(discount.rabatt));
            }else{
                return warn ? warningWordingStamps : _('yd-jig-checkout-discount-stampcard-next');
            }
        } else {
            if (discount.exclusive) {
                return warn ? _('yd-jig-partnerdiscount-exclusive-general', amount) + " " + warningWording : _('yd-jig-partnerdiscount-exclusive-general', amount);
            } else {
                return warn ? _('yd-jig-partnerdiscount-general', amount) + " " + warningWording : _('yd-jig-partnerdiscount-general', amount);
            }
        }
    },
    discountTypeClass: function (discount, preorder) {
        var cssClass = preorder ? "hidden" : "yd-without-discount";
        if (discount) {
            if (discount.newCustomer) {
                cssClass = 'yd-jig-partnerdiscount-newcustomer yd-discount-newcustomer';
            } else if (discount.discountType === "stp") {
                cssClass = 'yd-jig-partnerdiscount-stamps yd-discount-stamps';
                if (preorder) {
                    cssClass += " yd-jig-partnerdiscountselect-current-disabled";
                }
            } else if (!discount.code) {
                cssClass = 'yd-jig-partnerdiscount-discount yd-discount-normal';
            } else if (discount.code) {
                cssClass = "yd-discount-code";
            }
        }
        return cssClass;
    },
//TODO used ?
    cartAnimation: function (meal) {
        return function (el) {
            var $el = $(el),
                mealOldHeight = '50px',
                mealHeight;
            if (!meal.cartAnimation) {
                $el.css('height', mealOldHeight);
                $el.animate({
                    width: '100%'
                }, 200, function () {
                    mealHeight = $el.css('height', 'auto').height() + 'px';
                    $el.css('height', mealOldHeight);
                    $el.animate({
                        height: mealHeight
                    }, 500);
                });
                meal.attr('cartAnimation', true);
            }
        };
    },
    childPagePath: function (root, childpages, level) {
        var url = "/" + root,
            i;
        level = level !== "undefined" ? level : childpages.length - 1;
        for (i = 0; i <= level; i++) {
            url += "/" + _(childpages[i].url);
        }
        return url;
    },
    htmlheadTitle: function (orig, domain) {
        var fullName,
            restaurant = this.Yd.predefined && this.Yd.predefined.restaurant,
            location = this.Yd.predefined && this.Yd.predefined.location,
            internallink = this.Yd.predefined && this.Yd.predefined.internallink,
            titleSet = false;
        if (this.Yd.config["satellite"]) {
            if (orig) {
                return orig;
            } else {
                if (this.page === "menu") {
                    return _("yd-jig-satellites-meta-title-menu", restaurant.name, restaurant.locationName);
                } else {
                    return _("yd-jig-satellites-meta-title-default", restaurant.name, restaurant.locationName);
                }
            }
        } else {
            if (restaurant) {
                if (this.page === "menuinfo") {
                    if (restaurant.name.match(/(Lieferservice|restaurant)/i)) {
                        return _("yd-jig-htmlhead-menuinfo-title", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                    } else {
                        return _("yd-jig-htmlhead-menuinfo-title-pure", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                    }
                } else if (this.page === "ratings") {
                    if (this["child-page-path"] && this["child-page-path"][1] && this["child-page-path"][1].name) {
                        if (this["child-page-path"][1].name.indexOf("quality") !== -1) {
                            switch (domain) {
                                case "taxiresto.fr":
                                    if (restaurant.name.match(/restaurant/i)) {
                                        return _("yd-jig-htmlhead-ratings-quality-title-fr", _(this["child-page-path"][1].name), restaurant.name, restaurant.locationName);
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-quality-title-pure-fr", _(this["child-page-path"][1].name), restaurant.name, restaurant.locationName);
                                    }
                                case "pyszne.pl":
                                    return _("yd-jig-htmlhead-ratings-quality-title-pl", restaurant.name, restaurant.locationName, _(this["child-page-path"][1].name));
                                default:
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-ratings-quality-title-de", restaurant.name, restaurant.locationName, _(this["child-page-path"][1].name));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-quality-title-pure-de", restaurant.name, restaurant.locationName, _(this["child-page-path"][1].name));
                                    }
                            }
                            titleSet = true;
                        } else if (this["child-page-path"][1].name.indexOf("delivery") !== -1) {
                            switch (domain) {
                                case "taxiresto.fr":
                                    if (restaurant.name.match(/restaurant/i)) {
                                        return _("yd-jig-htmlhead-ratings-delivery-title-fr", _(this["child-page-path"][1].name), restaurant.name, restaurant.locationName);
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-delivery-title-pure-fr", _(this["child-page-path"][1].name), restaurant.name, restaurant.locationName);
                                    }
                                case "pyszne.pl":
                                    return _("yd-jig-htmlhead-ratings-delivery-title-pl", restaurant.name, restaurant.locationName, _(this["child-page-path"][1].name));
                                default:
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-ratings-delivery-title-de", restaurant.name, restaurant.locationName, _(this["child-page-path"][1].name));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-delivery-title-pure-de", restaurant.name, restaurant.locationName, _(this["child-page-path"][1].name));
                                    }
                            }
                            titleSet = true;
                        } else if (this["child-page-path"][1].name.indexOf("mealfilter") !== -1) {
                            switch (domain) {
                                case "taxiresto.fr":
                                    if (restaurant.name.match(/restaurant/i)) {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-title-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-title-pure-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1));
                                    }
                                case "pyszne.pl":
                                    return _("yd-jig-htmlhead-ratings-mealfilter-title-pl", restaurant.name, restaurant.locationName, this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1));
                                default:
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-title-de", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1), restaurant.name, restaurant.locationName);
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-title-pure-de", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1), restaurant.name, restaurant.locationName);
                                    }
                            }
                            titleSet = true;
                        }
                    }
                    if (!titleSet) {
                        switch (domain) {
                            case "taxiresto.fr":
                                if (restaurant.name.match(/restaurant/i)) {
                                    return _("yd-jig-htmlhead-ratings-title-fr", restaurant.name, restaurant.locationName);
                                } else {
                                    return _("yd-jig-htmlhead-ratings-title-pure-fr", restaurant.name, restaurant.locationName);
                                }
                            case "pyszne.pl":
                                return _("yd-jig-htmlhead-ratings-title-pl", restaurant.name, restaurant.locationName);
                            default:
                                if (restaurant.name.indexOf("Lieferservice") === -1) {
                                    return _("yd-jig-htmlhead-ratings-title-de", restaurant.name, restaurant.locationName);
                                } else {
                                    return _("yd-jig-htmlhead-ratings-title-pure-de", restaurant.name, restaurant.locationName);
                                }
                        }
                    }
                } else {
                    if (restaurant.metaTitle) {
                        return restaurant.metaTitle;
                    } else {
                        switch (domain) {
                            case "taxiresto.fr":
                                if (restaurant.name.match(/restaurant/i)) {
                                    return _("yd-jig-htmlhead-menu-title-fr", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName, restaurant.restaurantCategory || "");
                                } else {
                                    return _("yd-jig-htmlhead-menu-title-pure-fr", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName, restaurant.restaurantCategory || "");
                                }
                            case "pyszne.pl":
                                if (restaurant.restaurantCategory === "Kuchnia włoska") {
                                    return _("yd-jig-htmlhead-menu-title-italian-pl", restaurant.name, restaurant.locationName);
                                } else {
                                    return _("yd-jig-htmlhead-menu-title-pl", restaurant.name, restaurant.locationName);
                                }
                            default:
                                if (restaurant.restaurantCategory === "Italienisch") {
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-menu-title-italian-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                    } else {
                                        return _("yd-jig-htmlhead-menu-title-italian-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                    }
                                } else if (restaurant.restaurantCategory) {
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-menu-title-catdescription-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                    } else {
                                        return _("yd-jig-htmlhead-menu-title-catdescription-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                    }
                                } else {
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-menu-title-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                    } else {
                                        return _("yd-jig-htmlhead-menu-title-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                    }
                                }
                        }
                    }
                }
            } else if (location) {
                fullName = (location.plz ? location.plz + " " : ""
                    ) + location.locationName;
                switch (domain) {
                    case "taxiresto.fr":
                        return _("yd-jig-htmlhead-service-title-fr", fullName);
                    case "pyszne.pl":
                        if (location.plz) {
                            return _("yd-jig-htmlhead-service-title-pl-plz", location.name, location.plz);
                        } else if (this.Yd.predefined.districtId) {
                            return _("yd-jig-htmlhead-service-title-pl-district", location.name);
                        } else {
                            return _("yd-jig-htmlhead-service-title-pl", location.name);
                        }
                    default:
                        if (location.plz) {
                            return _("yd-jig-htmlhead-service-title-de-plz", location.name, location.plz, location.locationName);
                        } else {
                            return _("yd-jig-htmlhead-service-title-de", location.name, location.locationName);
                        }
                }
            } else if (internallink) {
                if (internallink.htmlTitle) {
                    return internallink.htmlTitle;
                }
            }
            return _("yd-jig-htmlhead-title-fallback");
        }
    },
    htmlheadDescription: function (orig, domain) {
        var fullName,
            restaurant = this.Yd.predefined && this.Yd.predefined.restaurant,
            location = this.Yd.predefined && this.Yd.predefined.location,
            internallink = this.Yd.predefined && this.Yd.predefined.internallink,
            titleSet = false;
        if (this.Yd.config["satellite"]) {
            if (orig) {
                return orig;
            } else {
                if (this.page === "menu") {
                    return _("yd-jig-satellites-meta-description-menu", restaurant.name, restaurant.locationName, restaurant.locationName);
                } else {
                    return _("yd-jig-satellites-meta-description-default", restaurant.name, restaurant.locationName);
                }
            }
        } else {
            if (restaurant) {
                if (this.page === "menuinfo") {
                    switch (domain) {
                        case "taxiresto.fr":
                            if (restaurant.name.match(/restaurant/i)) {
                                return _("yd-jig-htmlhead-menuinfo-description-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                            } else {
                                return _("yd-jig-htmlhead-menuinfo-description-pure-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                            }
                        case "pyszne.pl":
                            if (restaurant.restaurantCategory && restaurant.restaurantCategory.indexOf("Kuchnia") === -1) {
                                return _("yd-jig-htmlhead-menuinfo-description-pl", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName);
                            } else {
                                return _("yd-jig-htmlhead-menuinfo-description-pure-pl", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName);
                            }
                        default:
                            if (restaurant.name.indexOf("Lieferservice") === -1) {
                                return _("yd-jig-htmlhead-menuinfo-description-de", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName);
                            } else {
                                return _("yd-jig-htmlhead-menuinfo-description-pure-de", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName);
                            }
                    }
                } else if (this.page === "ratings") {
                    if (this["child-page-path"] && this["child-page-path"][1] && this["child-page-path"][1].name) {
                        if (this["child-page-path"][1].name.indexOf("quality") !== -1) {
                            switch (domain) {
                                case "taxiresto.fr":
                                    if (restaurant.name.match(/restaurant/i)) {
                                        return _("yd-jig-htmlhead-ratings-quality-description-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-quality-description-pure-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name));
                                    }
                                case "pyszne.pl":
                                    if (restaurant.restaurantCategory && restaurant.restaurantCategory.indexOf("Kuchnia") === -1) {
                                        return _("yd-jig-htmlhead-ratings-quality-description-pl", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-quality-description-pure-pl", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name));
                                    }
                                default:
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-ratings-quality-description-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-quality-description-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name));
                                    }
                            }
                            titleSet = true;
                        } else if (this["child-page-path"][1].name.indexOf("delivery") !== -1) {
                            switch (domain) {
                                case "taxiresto.fr":
                                    if (restaurant.name.match(/restaurant/i)) {
                                        return _("yd-jig-htmlhead-ratings-delivery-description-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-delivery-description-pure-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name));
                                    }
                                case "pyszne.pl":
                                    if (restaurant.restaurantCategory && restaurant.restaurantCategory.indexOf("Kuchnia") === -1) {
                                        return _("yd-jig-htmlhead-ratings-delivery-description-pl", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName, _(this["child-page-path"][1].name));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-delivery-description-pure-pl", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName, _(this["child-page-path"][1].name));
                                    }
                                default:
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-ratings-delivery-description-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name), restaurant.name);
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-delivery-description-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name), restaurant.name);
                                    }
                            }
                            titleSet = true;
                        } else if (this["child-page-path"][1].name.indexOf("mealfilter") !== -1) {
                            switch (domain) {
                                case "taxiresto.fr":
                                    if (restaurant.name.match(/restaurant/i)) {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-description-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-description-pure-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1));
                                    }
                                case "pyszne.pl":
                                    if (restaurant.restaurantCategory && restaurant.restaurantCategory.indexOf("Kuchnia") === -1) {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-description-pl", restaurant.name, this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1), restaurant.restaurantCategory || "", restaurant.locationName);
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-description-pure-pl", restaurant.name, this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1), restaurant.restaurantCategory || "", restaurant.locationName);
                                    }
                                default:
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-description-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-description-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1));
                                    }
                            }
                            titleSet = true;
                        }
                    }
                    if (!titleSet) {
                        switch (domain) {
                            case "taxiresto.fr":
                                if (restaurant.name.match(/restaurant/i)) {
                                    return _("yd-jig-htmlhead-ratings-description-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                } else {
                                    return _("yd-jig-htmlhead-ratings-description-pure-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                }
                            case "pyszne.pl":
                                if (restaurant.restaurantCategory && restaurant.restaurantCategory.indexOf("Kuchnia") === -1) {
                                    return _("yd-jig-htmlhead-ratings-description-pl", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                } else {
                                    return _("yd-jig-htmlhead-ratings-description-pure-pl", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                }
                            default:
                                if (restaurant.name.indexOf("Lieferservice") === -1) {
                                    return _("yd-jig-htmlhead-ratings-description-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                } else {
                                    return _("yd-jig-htmlhead-ratings-description-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                }
                        }
                    }
                } else {
                    if (restaurant.metaDescription) {
                        return restaurant.metaDescription;
                    } else {
                        switch (domain) {
                            case "taxiresto.fr":
                                if (restaurant.name.match(/restaurant/i)) {
                                    return _("yd-jig-htmlhead-menu-description-fr", restaurant.locationName, restaurant.restaurantCategory || "", restaurant.name, restaurant.restaurantCategory || "", restaurant.name);
                                } else {
                                    return _("yd-jig-htmlhead-menu-description-pure-fr", restaurant.locationName, restaurant.restaurantCategory || "", restaurant.name, restaurant.restaurantCategory || "", restaurant.name);
                                }
                            case "pyszne.pl":
                                if (restaurant.restaurantCategory === "Kuchnia włoska") {
                                    return _("yd-jig-htmlhead-menu-description-italian-pl", restaurant.name, restaurant.locationName);
                                } else {
                                    return _("yd-jig-htmlhead-menu-description-pl", restaurant.name, restaurant.locationName, restaurant.name);
                                }
                            default:
                                if (restaurant.restaurantCategory === "Italienisch") {
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-menu-description-italian-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategoryDescription || "");
                                    } else {
                                        return _("yd-jig-htmlhead-menu-description-italian-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategoryDescription || "");
                                    }
                                } else if (restaurant.restaurantCategoryDescription) {
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-menu-description-catdescription-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategoryDescription);
                                    } else {
                                        return _("yd-jig-htmlhead-menu-description-catdescription-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategoryDescription);
                                    }
                                } else {
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-menu-description-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                    } else {
                                        return _("yd-jig-htmlhead-menu-description-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                    }
                                }
                        }
                    }
                }
            } else if (location) {
                fullName = (location.plz ? location.plz + " " : ""
                    ) + location.locationName;
                switch (domain) {
                    case "taxiresto.fr":
                        if (location.plz) {
                            return _("yd-jig-htmlhead-service-description-fr-plz", location.name, fullName, location.plz);
                        } else {
                            return _("yd-jig-htmlhead-service-description-fr", location.name, fullName);
                        }
                    case "pyszne.pl":
                        if (location.plz) {
                            return _("yd-jig-htmlhead-service-description-pl-plz", location.name, location.plz, location.locationName);
                        } else if (this.Yd.predefined.districtId) {
                            return _("yd-jig-htmlhead-service-description-pl-district", location.name, location.locationName);
                        } else {
                            return _("yd-jig-htmlhead-service-description-pl", location.name, location.locationName);
                        }
                    default:
                        if (location.plz) {
                            return _("yd-jig-htmlhead-service-description-de-plz", location.name, location.plz, location.locationName, location.plz);
                        } else {
                            return _("yd-jig-htmlhead-service-description-de", location.name, fullName);
                        }
                }
            } else if (internallink) {
                if (internallink.metaDescription) {
                    return internallink.metaDescription;
                }
            }
            return _("yd-jig-htmlhead-description-fallback");
        }
    },
    htmlheadKeywords: function (orig, domain) {
        var restaurant = this.Yd.predefined && this.Yd.predefined.restaurant,
            location = this.Yd.predefined && this.Yd.predefined.location,
            internallink = this.Yd.predefined && this.Yd.predefined.internallink,
            titleSet = false;
        if (this.Yd.config["satellite"]) {
            if (orig) {
                return orig;
            } else {
                if (this.page === "menu") {
                    return _("yd-jig-satellites-meta-keywords-menu", restaurant.name, restaurant.locationName);
                } else {
                    return _("yd-jig-satellites-meta-keywords-default", restaurant.name, restaurant.locationName);
                }
            }
        } else {
            if (restaurant) {
                if (this.page === "menuinfo") {
                    switch (domain) {
                        case "taxiresto.fr":
                            if (restaurant.name.match(/restaurant/i)) {
                                return _("yd-jig-htmlhead-menuinfo-keywords-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory);
                            } else {
                                return _("yd-jig-htmlhead-menuinfo-keywords-pure-fr", restaurant.name, restaurant.locationName, restaurant.restaurantCategory);
                            }
                        case "pyszne.pl":
                            if (restaurant.restaurantCategory && restaurant.restaurantCategory.indexOf("Kuchnia") === -1) {
                                return _("yd-jig-htmlhead-menuinfo-keywords-pl", restaurant.name, restaurant.restaurantCategory || "", restaurant.name, restaurant.locationName);
                            } else {
                                return _("yd-jig-htmlhead-menuinfo-keywords-pure-pl", restaurant.name, restaurant.restaurantCategory || "", restaurant.name, restaurant.locationName);
                            }
                        default:
                            if (restaurant.name.indexOf("Lieferservice") === -1) {
                                return _("yd-jig-htmlhead-menuinfo-keywords-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory);
                            } else {
                                return _("yd-jig-htmlhead-menuinfo-keywords-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory);
                            }
                    }
                } else if (this.page === "ratings") {
                    if (this["child-page-path"] && this["child-page-path"][1] && this["child-page-path"][1].name) {
                        if (this["child-page-path"][1].name.indexOf("quality") !== -1) {
                            switch (domain) {
                                case "taxiresto.fr":
                                    if (restaurant.name.match(/restaurant/i)) {
                                        return _("yd-jig-htmlhead-ratings-quality-keywords-fr", _(this["child-page-path"][1].name), restaurant.name, restaurant.locationName);
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-quality-keywords-pure-fr", _(this["child-page-path"][1].name), restaurant.name, restaurant.locationName);
                                    }
                                case "pyszne.pl":
                                    if (restaurant.restaurantCategory && restaurant.restaurantCategory.indexOf("Kuchnia") === -1) {
                                        return _("yd-jig-htmlhead-ratings-quality-keywords-pl", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName, restaurant.name, _(this["child-page-path"][1].name));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-quality-keywords-pure-pl", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName, restaurant.name, _(this["child-page-path"][1].name));
                                    }
                                default:
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-ratings-quality-keywords-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-quality-keywords-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name));
                                    }
                            }
                            titleSet = true;
                        } else if (this["child-page-path"][1].name.indexOf("delivery") !== -1) {
                            switch (domain) {
                                case "taxiresto.fr":
                                    if (restaurant.name.match(/restaurant/i)) {
                                        return _("yd-jig-htmlhead-ratings-delivery-keywords-fr", _(this["child-page-path"][1].name), restaurant.name, restaurant.locationName);
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-delivery-keywords-pure-fr", _(this["child-page-path"][1].name), restaurant.name, restaurant.locationName);
                                    }
                                case "pyszne.pl":
                                    if (restaurant.restaurantCategory && restaurant.restaurantCategory.indexOf("Kuchnia") === -1) {
                                        return _("yd-jig-htmlhead-ratings-delivery-keywords-pl", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName, _(this["child-page-path"][1].name));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-delivery-keywords-pure-pl", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName, _(this["child-page-path"][1].name));
                                    }
                                default:
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-ratings-delivery-keywords-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name));
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-delivery-keywords-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "", _(this["child-page-path"][1].name));
                                    }
                            }
                            titleSet = true;
                        } else if (this["child-page-path"][1].name.indexOf("mealfilter") !== -1) {
                            switch (domain) {
                                case "taxiresto.fr":
                                    if (restaurant.name.match(/restaurant/i)) {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-keywords-fr", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1), restaurant.name, restaurant.locationName);
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-keywords-pure-fr", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1), restaurant.name, restaurant.locationName);
                                    }
                                case "pyszne.pl":
                                    if (restaurant.restaurantCategory && restaurant.restaurantCategory.indexOf("Kuchnia") === -1) {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-keywords-pl", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1), restaurant.name, restaurant.restaurantCategory || "", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1), restaurant.locationName);
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-keywords-pure-pl", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1), restaurant.name, restaurant.restaurantCategory || "", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1), restaurant.locationName);
                                    }
                                default:
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-keywords-de", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1), restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                    } else {
                                        return _("yd-jig-htmlhead-ratings-mealfilter-keywords-pure-de", this["child-page-path"][1].name.substr(this["child-page-path"][1].name.indexOf(",") + 1), restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                    }
                            }
                            titleSet = true;
                        }
                    }
                    if (!titleSet) {
                        switch (domain) {
                            case "taxiresto.fr":
                                if (restaurant.name.match(/restaurant/i)) {
                                    return _("yd-jig-htmlhead-ratings-keywords-fr", restaurant.name, restaurant.locationName);
                                } else {
                                    return _("yd-jig-htmlhead-ratings-keywords-pure-fr", restaurant.name, restaurant.locationName);
                                }
                            case "pyszne.pl":
                                if (restaurant.restaurantCategory && restaurant.restaurantCategory.indexOf("Kuchnia") === -1) {
                                    return _("yd-jig-htmlhead-ratings-keywords-pl", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName);
                                } else {
                                    return _("yd-jig-htmlhead-ratings-keywords-pure-pl", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName);
                                }
                            default:
                                if (restaurant.name.indexOf("Lieferservice") === -1) {
                                    return _("yd-jig-htmlhead-ratings-keywords-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                } else {
                                    return _("yd-jig-htmlhead-ratings-keywords-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                }
                        }
                    }
                } else {
                    if (restaurant.metaKeywords) {
                        return restaurant.metaKeywords;
                    } else {
                        switch (domain) {
                            case "taxiresto.fr":
                                if (restaurant.name.match(/restaurant/i)) {
                                    return _("yd-jig-htmlhead-menu-keywords-fr", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName);
                                } else {
                                    return _("yd-jig-htmlhead-menu-keywords-pure-fr", restaurant.name, restaurant.restaurantCategory || "", restaurant.locationName);
                                }
                            case "pyszne.pl":
                                if (restaurant.restaurantCategory === "Kuchnia włoska") {
                                    return _("yd-jig-htmlhead-menu-keywords-italian-pl", restaurant.name, restaurant.locationName);
                                } else if (restaurant.restaurantCategory) {
                                    if (restaurant.restaurantCategory.indexOf("Kuchnia") === -1) {
                                        return _("yd-jig-htmlhead-menu-keywords-category-pl", restaurant.name, restaurant.restaurantCategory, restaurant.locationName);
                                    } else {
                                        return _("yd-jig-htmlhead-menu-keywords-category-pure-pl", restaurant.name, restaurant.restaurantCategory, restaurant.locationName);
                                    }
                                } else {
                                    return _("yd-jig-htmlhead-menu-keywords-pl", restaurant.name, restaurant.locationName);
                                }
                            default:
                                if (restaurant.restaurantCategory === "Italienisch") {
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-menu-keywords-italian-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory, restaurant.restaurantCategoryDescription || "");
                                    } else {
                                        return _("yd-jig-htmlhead-menu-keywords-italian-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory, restaurant.restaurantCategoryDescription || "");
                                    }
                                } else if (restaurant.restaurantCategoryDescription) {
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-menu-keywords-catdescription-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory, restaurant.restaurantCategoryDescription);
                                    } else {
                                        return _("yd-jig-htmlhead-menu-keywords-catdescription-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory, restaurant.restaurantCategoryDescription);
                                    }
                                } else {
                                    if (restaurant.name.indexOf("Lieferservice") === -1) {
                                        return _("yd-jig-htmlhead-menu-keywords-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                    } else {
                                        return _("yd-jig-htmlhead-menu-keywords-pure-de", restaurant.name, restaurant.locationName, restaurant.restaurantCategory || "");
                                    }
                                }
                        }
                    }
                }
            } else if (location && domain === "pyszne.pl") {
                if (location.plz) {
                    return _("yd-jig-htmlhead-service-keywords-pl-plz", location.locationName);
                } else if (this.Yd.predefined.districtId) {
                    return _("yd-jig-htmlhead-service-keywords-pl-district", location.locationName);
                } else {
                    return _("yd-jig-htmlhead-service-keywords-pl", location.locationName);
                }
            } else if (internallink) {
                if (internallink.metaKeywords) {
                    return internallink.metaKeywords;
                }
            }
            return _("yd-jig-htmlhead-keywords-fallback");
        }
    },
    htmlheadRobots: function (orig, domain) {
        var restaurant = this.Yd.predefined && this.Yd.predefined.restaurant,
            satellite = this.Yd.predefined && this.Yd.predefined.satellite,
            location = this.Yd.predefined && this.Yd.predefined.location,
            restaurants = this.Yd.predefined && this.Yd.predefined.restaurants,
            internallink = this.Yd.predefined && this.Yd.predefined.internallink,
            ratings = this.Yd.predefined && this.Yd.predefined.ratings,
            i,
            messagesCount = 0;

        if (!this.isMainLocale() && (!this.Yd.predefined || !this.Yd.predefined.pageType || this.Yd.predefined.pageType !== "index")) {
            return "noindex,follow";
        }
        if (restaurant) {
            if (satellite && (this.page === "imprint" || this.page === "menu")) {
                return "noindex,follow";
            }
            if (ratings && ratings.lastRatings) {
                for (i = 0; i < ratings.lastRatings.length; i++) {
                    if (ratings.lastRatings[i].message) {
                        messagesCount++;
                    }
                }
                if (messagesCount < 6) {
                    return "noindex,follow";
                }
            }
            if (satellite && satellite.metaRobots) {
                return satellite.metaRobots;
            } else if (restaurant.metaRobots) {
                return restaurant.metaRobots;
            } else {
                return "index,follow";
            }
        } else if (location) {
            if (restaurants && restaurants.length) {
                return "index,follow";
            } else {
                return "noindex,follow";
            }
        } else if (internallink) {
            if (internallink.metaRobots) {
                return internallink.metaRobots;
            }
        }
        return orig;
    },
    ratingsLink: function (restUrl, ratingsLink, childPagePath, content, count, currentLink, restaurantName, cssClass) {
        var string;
        if (count && count > 4 && (!childPagePath[1] || currentLink != childPagePath[1].url && childPagePath[1].name.indexOf(",") === -1
            )) {
            string = '<a href="' + this.pageLink("ratings", restUrl) + '/' + ratingsLink + '" class="' + (cssClass || ''
                ) + '"';
            if (content.indexOf("<") === -1 && restaurantName) {
                if (currentLink.indexOf("quality") !== -1) {
                    string += ' title="' + _("yd-jig-ratings-ratingquality-link-title", restaurantName, content.toLowerCase()) + '"';
                } else {
                    string += ' title="' + _("yd-jig-ratings-ratingdelivery-link-title", restaurantName, content.toLowerCase()) + '"';
                }
            }
            string += '>' + content + '</a>';
            return string;
        } else if (cssClass && (!childPagePath[1] || currentLink != childPagePath[1].url && childPagePath[1].name.indexOf(",") === -1)){
            return '<span class="' + (cssClass || '') + '">' + content + '</span>' +
                '<span class="yd-tooltip yd-tooltip-fade yd-arrow-bl">'+ _('yd-jig-ratings-overview-table-label-tooltip') +'</span>';
        } else if (cssClass) {
            return '<span class="' + (cssClass || '') + '">' + content +'</span>';
        } else {
            return content;
        }
    },
    nameCount: function (arr) {
        var c = 0,
            i,
            l,
            lastName;
        if (arr && arr.length) {
            for (i = 0, l = arr.length; i < l; i++) {
                if (lastName != arr[i].name) {
                    c++;
                    lastName = arr[i].name;
                }
            }
        }
        return c;
    },
    bonusshopHasAvailableBonus: function (bonus, length) {
        for (var i = 0; i < length; i++) {
            if (bonus[i] && bonus[i].attr("available")) {
                return true;
            }
        }
        return false;
    },
    mainMealCategoryIndex: function (meals) {
        var i = 0,
            l = meals && meals.length;
        if (l) {
            for (; i < l; i++) {
                if (meals[i].main) {
                    return i
                }
            }
        }
        return 0;
    },
    mealCategoryMaxSizeCount: function (meals) {
        var count = 0,
            i = 0,
            l = meals.length;
        for (; i < l; i++) {
            if (meals[i].sizes.length > count) {
                count = meals[i].sizes.length;
            }
        }
        return count;
    },
    mealCategorySort: function (sizes) {
        var sizes1 = [],
            sizes2 = [],
            i = 0,
            l = sizes.length;
        for (; i < l; i++) {
            if (sizes[i].name.search(/^normal$/i) === -1) {
                sizes1.push(sizes[i]);
            } else {
                sizes2.push(sizes[i]);
            }
        }
        return sizes1.concat(sizes2);
    },
    calculateDiscount: function (discount) {
        if (discount.kind === 0) {
            return  discount.rabatt + '%';
        } else {
            return  _("yd-jig-discount-price", (discount.rabatt / 100
                ).toFixed(2));
        }
    },
    camelCase: function (string) {
        return string.replace(/((^|-)[a-z])/g, function ($1) {
            return $1.toUpperCase().replace('-', ' ');
        });
    },
    getRelatedLinks: function (links, domain) {
        links = links || [];
        var globalLinks,
            i,
            l = links.length;
        if (domain === "lieferando.de") {
            globalLinks = [
                {
                    "url": "essen-bestellen",
                    "name": "Essen bestellen online | Pizza, Sushi, Burger & Co vom Lieferservice"
                },
                {
                    "url": "lieferdienst",
                    "name": "NEU: Lieferdienst finden, online bestellen & bargeldlos zahlen!"
                },
                {
                    "url": "lieferservice",
                    "name": "Lieferservice finden & online Essen bestellen bei lieferando"
                },
                {
                    "url": "pizza-lieferservice",
                    "name": "JETZT Pizza Lieferservice in Ihrer Stadt mit lieferando finden!"
                },
                {
                    "url": "pizza-online-bestellen",
                    "name": "JETZT Pizza online bestellen – Top Auswahl, schnelle Lieferung"
                },
                {
                    "url": "pizzaservice",
                    "name": "Pizzaservice finden & Pizza online bestellen! Bargeldlos zahlen!"
                },
                {
                    "url": "pizza-bestellen",
                    "name": "Pizza bestellen - PLZ eingeben | Pizzaservice finden"
                },
                {
                    "url": "pizza-service",
                    "name": "HIER Pizza Service vor Ort bei lieferando finden & online bestellen!"
                }
            ]
            if (l < 8) {
                for (i = 0; i < 8 - l; i++) {
                    links.push(globalLinks[i]);
                }
            }
        }
        return links;
    },
    replaceTimThumbSize: function (image, width, height) {
        return image ? image.replace(/-0-0\.(jpe?g|png|gif)$/, function($1, $2) {
            return "-" + width + "-" + height +"." + $2;
        }) : "";
    },
    convertGermanDate: function (date) {
        var dateArr = date.match(/(\d\d)\.(\d\d)\.(\d\d\d\d)/);
        if (dateArr) {
            return dateArr[3] + "-" + dateArr[2] + "-" + dateArr[1];
        } else {
            return date;
        }
    },
    convertFromGermanDate: function (date, format) {
        switch (format) {
            case "dd/mm/yy":
                return date.replace(/\./g, "/");
            default:
                return date;
        }
    }

};
