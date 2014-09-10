module.exports = function () {
    var vm = require("vm"),
        fs = require("fs"),
        filterModel = require('./predefinedFilterValues.js'),
        deepExtend = require("deep-extend");


    return {
        init: function (data) {
            var self = this,
                defaults;

            for (var filter in  filterModel) {
                if (filter !== 'kitchenType' && typeof filterModel[filter] === 'function') {
                    this[filter] = filterModel[filter];
                } else {
                    this[filter] = deepExtend({}, filterModel[filter]);
                }
            }
            defaults = self.defaults;
            self.initTranslation();

            for (var value  in data.restaurants) {
                var service = data.restaurants[value];
                self.maxMinRating(service);
                self.maxMinRatingCount(service);
                self.maxMinMincost(service);
                self.maxMinDelivercost(service);
                self.maxMinKitchenType(service);
            }

            //self.addCuisineType(data.restaurantSearch);

            self.sortKitchenTyp();
            defaults.ydJigFilterRatingMinCurrent = defaults.ydJigFilterRatingMin;
            defaults.ydJigFilterRatingMaxCurrent = defaults.ydJigFilterRatingMax;
            defaults.ydJigFilterRatingcountMinCurrent = defaults.ydJigFilterRatingcountMin;
            defaults.ydJigFilterRatingcountMaxCurrent = defaults.ydJigFilterRatingcountMax;
            defaults.ydJigFilterMincartMinCurrent = defaults.ydJigFilterMincartMin;
            defaults.ydJigFilterMincartMaxCurrent = defaults.ydJigFilterMincartMax;
            defaults.ydJigFilterDeliverycostMinCurrent = defaults.ydJigFilterDeliverycostMin;
            defaults.ydJigFilterDeliverycostMaxCurrent = defaults.ydJigFilterDeliverycostMax;
            return self.defaults;
        }

    };
};