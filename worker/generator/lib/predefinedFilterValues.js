if (typeof window === 'undefined') {
    window = this;
}
window.Yd = window.Yd || {};
window.Yd.reused = window.Yd.reused || {};
window.Yd.reused.FilterModel = {
    defaults: {
        // Min + Max Values
        ydJigFilterRatingMin: undefined,
        ydJigFilterRatingMax: undefined,
        ydJigFilterRatingcountMin: undefined,
        ydJigFilterRatingcountMax: undefined,
        ydJigFilterMincartMin: undefined,
        ydJigFilterMincartMax: undefined,
        ydJigFilterDeliverycostMin: undefined,
        ydJigFilterDeliverycostMax: undefined,
        /*
         YD-6816 TODO remove
        ydJigFilterPercentDiscountMin: 0,
        ydJigFilterPercentDiscountMax: 0,
        ydJigFilterAbsoluteDiscountMin: 0,
        ydJigFilterAbsoluteDiscountMax: 0,*/
        // Current Position
        ydJigFilterRatingMinCurrent: undefined,
        ydJigFilterRatingMaxCurrent: undefined,
        ydJigFilterRatingcountMinCurrent: undefined,
        ydJigFilterRatingcountMaxCurrent: undefined,
        ydJigFilterMincartMinCurrent: undefined,
        ydJigFilterMincartMaxCurrent: undefined,
        ydJigFilterDeliverycostMinCurrent: undefined,
        ydJigFilterDeliverycostMaxCurrent: undefined,
       /*
        YD-6816 TODO remove
        ydJigFilterPercentDiscountMinCurrent: undefined,
        ydJigFilterPercentDiscountMaxCurrent: undefined,
        ydJigFilterAbsoluteDiscountMinCurrent: undefined,
        ydJigFilterAbsoluteDiscountMaxCurrent: undefined,*/
        show: {
            Rating: true,
            RatingCount: true,
            MinCart: true,
            DeliveryCost: true,
            KitchenType: true,
            AbsoluteDiscount: true,
            PercentDiscount: true
        },
        // Filter Setting Full
        ydJigFilterFull: _("yd-jig-filter-choose-all"),
        kitchenType: {},
        /**
         * STATIC KITCHENTYPS
         * Italienisch
         * Chinesisch
         * Asiatisch
         * Vietnamesisch
         * Japanisch
         * Indisch
         * Thailändisch
         * Griechisch
         * Amerikanisch
         * Mexikanisch
         */
        kitchenTypeArray: [_("yd-jig-filter-all"), _("yd-jig-filter-italian"), _("yd-jig-filter-chinese"),
            _("yd-jig-filter-asian"), _("yd-jig-filter-vietnamese"), _("yd-jig-filter-japanese"), _("yd-jig-filter-indian"),
            _("yd-jig-filter-thai"), _("yd-jig-filter-greek"), _("yd-jig-filter-american"), _("yd-jig-filter-mexican"), _("yd-jig-filter-german")]
    },
    initTranslation: function () {
        if (!window.Yd || !window.Yd.predefined || !window.Yd.predefined.filterValues) {
            var defaults = this.defaults,
                filterALLTag = _("yd-jig-filter-all");
            defaults.kitchenType[filterALLTag] = 0;
            defaults.ydJigFilterFull = _("yd-jig-filter-choose-all");
            defaults.kitchenTypeArray = [filterALLTag, _("yd-jig-filter-italian"), _("yd-jig-filter-chinese"),
                _("yd-jig-filter-asian"), _("yd-jig-filter-vietnamese"), _("yd-jig-filter-japanese"), _("yd-jig-filter-indian"),
                _("yd-jig-filter-thai"), _("yd-jig-filter-greek"), _("yd-jig-filter-american"), _("yd-jig-filter-mexican"), _("yd-jig-filter-german")];
            defaults.transformer = [_("yd-jig-filter-italian"), _("yd-jig-filter-italian-untranslated"),
                _("yd-jig-filter-chinese"), _("yd-jig-filter-chinese-untranslated"),
                _("yd-jig-filter-asian"), _("yd-jig-filter-asian-untranslated"),
                _("yd-jig-filter-vietnamese"), _("yd-jig-filter-vietnamese-untranslated"),
                _("yd-jig-filter-japanese"), _("yd-jig-filter-japanese-untranslated"),
                _("yd-jig-filter-indian"), _("yd-jig-filter-indian-untranslated"),
                _("yd-jig-filter-thai"), _("yd-jig-filter-thai-untranslated"),
                _("yd-jig-filter-greek"), _("yd-jig-filter-greek-untranslated"),
                _("yd-jig-filter-american"), _("yd-jig-filter-american-untranslated"),
                _("yd-jig-filter-mexican"), _("yd-jig-filter-mexican-untranslated"),
                _("yd-jig-filter-german"), _("yd-jig-filter-german-untranslated")
            ];
        }
    },
    maxMinRating: function (v) {
        var self = this,
            rating = parseFloat(v.ratingAverage) || 0,
            defaults = self.defaults;
        rating = v.ratingCount ? rating : 0;
        defaults.ydJigFilterRatingMin = defaults.ydJigFilterRatingMin > rating || defaults.ydJigFilterRatingMin === undefined ? rating : defaults.ydJigFilterRatingMin;
        defaults.ydJigFilterRatingMax = defaults.ydJigFilterRatingMax < rating || defaults.ydJigFilterRatingMax === undefined ? rating : defaults.ydJigFilterRatingMax;
    },
    maxMinRatingCount: function (v) {
        var self = this,
            ratingCount = parseInt(v.ratingCount, 10) || 0,
            defults = self.defaults;
        ratingCount = ratingCount ? ratingCount : 0;
        defults.ydJigFilterRatingcountMin = defults.ydJigFilterRatingcountMin > ratingCount || defults.ydJigFilterRatingcountMin === undefined ? ratingCount : defults.ydJigFilterRatingcountMin;
        defults.ydJigFilterRatingcountMax = defults.ydJigFilterRatingcountMax < ratingCount || defults.ydJigFilterRatingcountMax === undefined ? ratingCount : defults.ydJigFilterRatingcountMax;
    },
    maxMinMincost: function (v) {
        var self = this,
            mincost = parseInt(v.mincost, 10) / 100 || 0,
            defults = self.defaults;
        defults.ydJigFilterMincartMin = defults.ydJigFilterMincartMin > mincost || defults.ydJigFilterMincartMin === undefined ? mincost : defults.ydJigFilterMincartMin;
        defults.ydJigFilterMincartMax = defults.ydJigFilterMincartMax < mincost || defults.ydJigFilterMincartMax === undefined ? mincost : defults.ydJigFilterMincartMax;
    },
    maxMinDelivercost: function (v) {
        var self = this,
            cost = parseInt(v.delivercost, 10) / 100 || 0,
            defults = self.defaults;
        defults.ydJigFilterDeliverycostMin = defults.ydJigFilterDeliverycostMin > cost || defults.ydJigFilterDeliverycostMin === undefined ? cost : defults.ydJigFilterDeliverycostMin;
        defults.ydJigFilterDeliverycostMax = defults.ydJigFilterDeliverycostMax < cost || defults.ydJigFilterDeliverycostMax === undefined ? cost : defults.ydJigFilterDeliverycostMax;
    },
    /*
    YD-6816 TODO remove
    maxMinabsolutediscount: function (v, discounts) {
        var self = this, i, len, cost,
            defults = self.defaults;
        if(discounts && v && discounts[v.id] && discounts[v.id].discounts && discounts[v.id].discounts.length){
            for(i = 0 , len = discounts[v.id].discounts.length; i < len ; i++ ){
                if(discounts[v.id].discounts[i].kind === 1){
                    cost = discounts[v.id].discounts[i].rabatt / 100 || 0;
                    defults.ydJigFilterAbsoluteDiscountMin = defults.ydJigFilterAbsoluteDiscountMin > cost || defults.ydJigFilterAbsoluteDiscountMin === undefined ? cost : defults.ydJigFilterAbsoluteDiscountMin;
                    defults.ydJigFilterAbsoluteDiscountMax = defults.ydJigFilterAbsoluteDiscountMax < cost || defults.ydJigFilterAbsoluteDiscountMax === undefined ? cost : defults.ydJigFilterAbsoluteDiscountMax;
                }
            }
        }
    },
    maxMinpercentdiscount: function (v, discounts) {
        var self = this, i, len, cost,
            defults = self.defaults;
        if(discounts && v && discounts[v.id] && discounts[v.id].discounts && discounts[v.id].discounts.length){
            for(i = 0 , len = discounts[v.id].discounts.length; i < len ; i++ ){
                if(discounts[v.id].discounts[i].kind === 0){
                    cost = discounts[v.id].discounts[i].rabatt || 0;
                    defults.ydJigFilterPercentDiscountMin = defults.ydJigFilterPercentDiscountMin > cost || defults.ydJigFilterPercentDiscountMin === undefined ? cost : defults.ydJigFilterPercentDiscountMin;
                    defults.ydJigFilterPercentDiscountMax = defults.ydJigFilterPercentDiscountMax < cost || defults.ydJigFilterPercentDiscountMax === undefined ? cost : defults.ydJigFilterPercentDiscountMax;
                }
            }
        }
    },*/
    /*
     * Add the kitchen types for the kitchen type filter list
     */
    maxMinKitchenType: function (v) {
        var self = this,
            tag = v.restaurantCategory,
            transTag = self.defaults.transformer[self.defaults.transformer.lastIndexOf(tag)-1];

        self.defaults.kitchenType[_("yd-jig-filter-all")]++;
        // We increase the count of the kitchen type, if the transTag is valid
        if (transTag) {
            if (self.defaults.kitchenType[transTag]) {
                self.defaults.kitchenType[transTag].count++;
                self.defaults.kitchenType[transTag].restaurants.push(v.id);
            } else if (self.defaults.transformer.indexOf(tag) !== -1) {
                self.defaults.kitchenType[transTag] = {
                    count: 1,
                    restaurants: [v.id]
                };
            }
        }
    },
// todo LM: check if can we remove this for good?
//    addCuisineType: function (restaurantSearch) {
//        var self = this,
//            tag,
//            i;
//        if (restaurantSearch) {
//            for (i in restaurantSearch) {
//                tag = restaurantSearch[i];
//                if (tag && tag.cuisine) {
//                    if (self.defaults.kitchenTypeArray.indexOf(tag.tag) !== -1) {
//                        if (self.defaults.kitchenType[tag.tag]) {
//                            self.defaults.kitchenType[tag.tag].count += tag.restaurantId.length;
//                            self.defaults.kitchenType[tag.tag].restaurants.push(tag.restaurantId);
//                        } else {
//                            self.defaults.kitchenType[tag] = {
//                                count: tag.restaurantId.length,
//                                restaurants: tag.restaurantId
//                            };
//                        }
//                    }
//                }
//            }
//        }
//    },
    sortKitchenTyp: function () {
        // YD-4785
        return false;
        var firstValue,
            self = this,
            kitchentype = self.defaults.kitchenType,
            kitchentypCount = self.defaults.kitchenTypeCountSorted,
        //kitchentypAlpha = self.defaults.kitchenTypeAlphaSorted;
        /*
         * Count sorting
         */
            firstValue = kitchentypCount.splice(0, 1)[0];
        kitchentypCount.sort(function (a, b) {
            return kitchentype[b] - kitchentype[a];
        });
        kitchentypCount.unshift(firstValue);
        self.defaults.kitchenTypeCountSorted = kitchentypCount.splice(0, 10);
        /*
         * Alpha sorting
         */
        //firstValue = kitchentypAlpha.splice(0, 1)[0];
        //kitchentypAlpha.sort();
        //kitchentypAlpha.unshift(firstValue);
    },
    /**
     * TODO remove ??
     * @param v
     */
    maxMinMealType: function (v) {
        var self = this,
            tags = v.mealTypes;
        if (!tags) {
            return;
        }
        tags = tags.split(/, ?/);
        if (tags.length > 0) {
            can.each(tags, function (va, i) {
                //noinspection JSLint
                if ($.inArray(va, self.defaults.mealType) < 0) {
                    self.defaults.mealType.push(va);
                }
            });
        }
    },
    isFilterUsed: function () {
        var defaults = this.defaults;
        defaults.show.Rating = defaults.ydJigFilterRatingMin === undefined || defaults.ydJigFilterRatingMax === undefined || (defaults.ydJigFilterRatingMax === defaults.ydJigFilterRatingMin
            ) ? false : defaults.show.Rating;
        defaults.show.RatingCount = defaults.ydJigFilterRatingcountMin === undefined || defaults.ydJigFilterRatingcountMax === undefined || (defaults.ydJigFilterRatingcountMax === defaults.ydJigFilterRatingcountMin
            ) ? false : defaults.show.RatingCount;
        defaults.show.MinCart = defaults.ydJigFilterMincartMin === undefined || defaults.ydJigFilterMincartMax === undefined || (defaults.ydJigFilterMincartMax === defaults.ydJigFilterMincartMin
            ) ? false : defaults.show.MinCart;
        defaults.show.DeliveryCost = defaults.ydJigFilterDeliverycostMin === undefined || defaults.ydJigFilterDeliverycostMax === undefined || (defaults.ydJigFilterDeliverycostMax === defaults.ydJigFilterDeliverycostMin
            ) ? false : defaults.show.DeliveryCost;

        /*
         YD-6816 TODO remove
        defaults.show.PercentDiscount = defaults.ydJigFilterPercentDiscountMin === undefined || defaults.ydJigFilterPercentDiscountMax === undefined || (defaults.ydJigFilterPercentDiscountMax === defaults.ydJigFilterPercentDiscountMin
            ) ? false : defaults.show.PercentDiscount;
        defaults.show.AbsoluteDiscount = defaults.ydJigFilterAbsoluteDiscountMin === undefined || defaults.ydJigFilterAbsoluteDiscountMax === undefined || (defaults.ydJigFilterAbsoluteDiscountMax === defaults.ydJigFilterAbsoluteDiscountMin
            ) ? false : defaults.show.AbsoluteDiscount;*/
        if (Object && typeof Object.keys === 'function') {
            defaults.show.KitchenType = Object.keys(defaults.kitchenType).length < 2 ? false : defaults.show.KitchenType;
        } else {
            defaults.show.KitchenType = false;
        }
    }
};
window.Yd.reused.FilterModel.initTranslation();
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = window.Yd.reused.FilterModel;
}