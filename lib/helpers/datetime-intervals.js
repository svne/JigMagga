/**
 * Created with JetBrains WebStorm.
 * @author Volodymyr Pavlyshyn
 * Date: 9/12/13
 * Time: 12:07 PM
 * Date time helper to calculate timing interval
 *
 */
steal('can', 'can/construct', function () {
    "use strict";
    /**
     *
     */
    var DateHelpers = {
            Constants: {
                HOURS_IN_DAY: 24,
                MINUTES_IN_DAY: 24 * 60,
                SECONDS_IN_MINUTE: 60 * 60,
                SECONDS_IN_DAY: 24 * 60 * 60,
                MILLISECONDS_IN_DAY: 24 * 60 * 60 * 1000,
                MILLISECONDS_IN_HOUR: 60 * 60 * 1000
            },
            /**
             * @function extractDateDistance
             * @param days{Number} - amount of days from discount config 0-6
             * @param time{String} - time string in format hh:mm
             * @param date{Date} - start data for delta if empty calc from now
             * @return{Number} milliseconds  - delta in milliseconds
             */
            getDateDistance: function (days, time, date) {
                var startDate = date || window.ydDate(),
                    startdays = startDate.getDay(),
                    d = days - startdays,
                    daysDelta = d >= 0 ? d : d + 7, // 7- week length
                    endDate, result,
                    replaceTime = DateHelpers.parseTimeString(time);
                endDate = DateHelpers.cloneDateWithOverrides(startDate, replaceTime, {date: daysDelta});
                result = endDate - startDate;
                return result;

            },
            /**
             *
             * @param timeString
             * @returns {Object} {hh:int ,mm:int}
             */
            parseTimeString: function (timeString) {
                var timeParts;
                if (timeString) {
                    timeParts = timeString.split(':');
                    if (timeParts && timeParts.length === 2) {
                        return  {hh: parseInt(timeParts[0], 10),
                            mm: parseInt(timeParts[1], 10)
                        };
                    }
                }
                return null;
            },
            makeTimeString: function (hh, mm) {
                return [hh < 10 ? '0' + hh : hh, mm < 10 ? '0' + mm : mm].join(':');
            },
            parseDateLimitString: function (dateString) {
                // "28.07.2013.22.19"
                var parts = dateString ? dateString.split('.') : [];
                if (parts.length === 5) {
                    return  DateHelpers.cloneDateWithOverrides(window.ydDate(), {y: +parts[2], month: (+parts[1] - 1), date: +parts[0], hh: +parts[3], mm: +parts[4], ss: 0, ms: 0});
                }
                if (parts.length === 3) {
                    return  DateHelpers.cloneDateWithOverrides(window.ydDate(), {y: +parts[2], month: (+parts[1] - 1), date: +parts[0]});
                }
                return null;
            },
            isInSameDate: function (tocompare, etalon) {
                return  Math.abs(tocompare - etalon) < DateHelpers.Constants.MILLISECONDS_IN_DAY;
            },
            /**
             * @function  cloneDateWithOverrides create new Datetime object and apply transformations on it
             * @param{Date} toclone - Date to clone if empty ydDate is used
             * @param{Object} replace  - Override values format {year : yyyy , date : dd , hh: 24, , ss , ms }
             * @param{Object} delta  -   set of integers that will be ADDED to date params format {year : int , date : int , hours: int, seconds , milliseconds }
             * @return{Date} - new date
             */
            cloneDateWithOverrides: function (toclone, replace, delta) {
                var tempDate = window.ydDate(),
                    _toclone = toclone || window.ydDate(),
                    r = replace || {},
                    d = delta || {},
                    month = (+r.month >= 0 ? r.month : _toclone.getMonth()) + (d.month || 0),
                    year = (r.y || _toclone.getFullYear()) + (d.y || 0),
                    date = (r.date || _toclone.getDate()) + (d.date || 0),
                    hour = (+r.hh >= 0 ? r.hh : _toclone.getHours()) + (d.hh || 0),
                    minutes = (+r.mm >= 0 ? r.mm : _toclone.getMinutes()) + (d.mm || 0),
                    seconds = (+r.ss >= 0 ? r.ss : _toclone.getSeconds()) + (d.ss || 0),
                    mseconds = (+r.ms >= 0 ? r.ms : _toclone.getMilliseconds()) + (d.ms || 0);
                tempDate.setFullYear(year);
                tempDate.setMonth(month);
                tempDate.setDate(date);
                tempDate.setHours(hour);
                tempDate.setMinutes(minutes);
                tempDate.setSeconds(seconds);
                tempDate.setMilliseconds(mseconds);
                return tempDate;
            },
            /**
             *
             * @param{Date} time
             * @param{Boolean} midnightAsZero convert 00:00, 24:00 to 00:00 if true else 24:00 returned
             * @returns {String} hh:mm formatted string of time component
             */
            getTimeString: function (time, midnightAsZero) {
                var hours = time.getHours(),
                    minutes = time.getMinutes(),
                    result = [(hours < 10 ? "0" + hours : hours),
                        (minutes < 10 ? "0" + minutes : minutes)].join(':');
                return (result === "00:00" || result === "24:00") ? ( !!midnightAsZero ? "00:00" : "24:00") : result;
            }
        },
        parserHelpers = {
            /**
             *
             * @param{Object} discounts objects array
             * "daytime": {
				 *"days": [1,2],
				 *"from": "11:00",
				 *"until": "12:00"
			     *   }
             *
             *@return{Object} map  of pairs {1T11:00: {day : 0,time "11:00"}
                 *                                    ,1T12:00: {day : 0,time "12:00"},
                 *                                    ,2T11:00: {day : 0,time "11:00"}
                  *                                    ,1T12:00: {day : 0,time "12:00"}} or collector updated if collector exists
             */
            discountsDayTimeUnFold: function (discounts, collector, isUnique) {
                var __resultMap = collector || {},
                    _key,
                    _data,
                    _from,
                    _until,
                    _days,
                    dayslen,
                    i, j,
                    _start,
                    _end,
                    day,
                    _isUnique = !!isUnique,
                    curentDiscount,
                    discountsLen = discounts.length;
                j = discountsLen;
                while (j--) {
                    curentDiscount = discounts[j];
                    _data = (curentDiscount && curentDiscount.daytime) ? curentDiscount.daytime : null;
                    _days = _data.days;
                    dayslen = _days.length;
                    i = dayslen;
                    _start = curentDiscount.startDate ? curentDiscount.startDate : '';
                    _end = curentDiscount.endDate ? curentDiscount.endDate : '';
                    if (_data && dayslen > 0) {
                        while (i--) {
                            day = _days[i];
                            _from = _data.from;
                            _until = _data.until;
                            if (_from) {
                                _key = [day, _from, _start, _end].join('');
                                if (!_isUnique || (_isUnique && __resultMap[_key] === undefined)) {
                                    __resultMap[_key] = {day: day, time: _from, start: _start, end: _end };
                                }
                            }

                            if (_until) {
                                _key = [day, _until, _start, _end].join('');
                                if (!_isUnique || (_isUnique && __resultMap[_key] === undefined)) {
                                    __resultMap[_key] = {day: day, time: _until, start: _start, end: _end};
                                }
                            }
                        }
                    }
                }
                return __resultMap;
            },

            /**
             * Process Discounts Items Objects
             * @param{Object} discounts - collection of discounts
             * @param{Object} collector
             * @param isUnique{Boolean} collect only unique data
             */
            getDiscountsDayTimeItems: function (discounts, collector, isUnique) {

                var __collector = collector || {},
                    result = [];
                can.each(discounts, function (k, r) {
                    var fullStamps = k.stpfull,
                        stampItem,
                        validDate,
                        stampIterator = (fullStamps) ? fullStamps.length : 0;

                    while (stampIterator--) {
                        stampItem = fullStamps[stampIterator];
                        if (stampItem.vd) {
                            validDate = DateHelpers.parseDateLimitString(stampItem.vd);
                            if (validDate && !__collector[stampItem.vd]) {
                                __collector[stampItem.vd] = {stamp: true, date: validDate};
                            }
                        }
                    }

                    if (k.discounts && k.discounts.length > 0) {
                        parserHelpers.discountsDayTimeUnFold(k.discounts, __collector, isUnique);
                    }
                });

                can.each(__collector, function (v, k) {
                    result.push(v);
                });
                return result;


            },
            /**
             *
             * @param services - list of restaurants
             * @param days - amount of days to generate date pairs
             * @param unique
             * @returns {{}}
             */

            openingsDayTimeUnFold: function (services, days, unique) {

                var service, item, i, _key, _day,
                    nowDate = window.ydDate(),
                    nextDayDate = window.ydDate(),
                    _days = days || 1,
                    __resultMap = {},
                    _isUnique = (typeof unique !== 'undefined') ? unique : true;

                $.each(services, function () {
                    service = this;
                    for (i = 0; i < _days; i++) {
                        nextDayDate.setDate(nowDate.getDate() + i);
                        $.each(service.getCurrentOpeningArray(nextDayDate), function () {
                            item = this;
                            if (item.from) {
                                _key = [item.day, item.from].join('');
                                if (!_isUnique || (_isUnique && __resultMap[_key] === undefined)) {
                                    __resultMap[_key] = {day: item.day, time: item.from, start: '', end: ''};
                                }
                            }

                            if (item.until) {
                                _day = item.day + ((item.from < item.until) ? 0 : 1);
                                _key = [_day, item.until].join('');
                                if (!_isUnique || (_isUnique && __resultMap[_key] === undefined)) {
                                    __resultMap[_key] = {day: _day, time: item.until, start: '', end: ''};
                                }
                            }
                        });
                    }

                });
                return __resultMap;
            },

            getOpeningDayTimeItems: function (services, collector, isUnique) {
                var result = [],
                    __collector = can.extend(collector || {},
                        parserHelpers.openingsDayTimeUnFold(services, 2, true));

                can.each(__collector, function (v) {
                    result.push(v);
                });
                return result;
            }

        },
        intervalsHelper = {
            /**
             *
             * @param dateTime
             * @param dayTimeItem
             * @param isUnique
             * @return - ordered time differences
             */
            getTimeDistances: function (dateTime, dayTimeItems, isUnique, threshold) {
                var result = [],
                    _isUnique = !!isUnique,
                    _threshold = threshold || 0,
                    _dates = {},
                    val,
                    current,
                    endLimit,
                    startLimit,
                    isLimited,
                    isTimeInRange,
                    filter = dateTime,
                    j = dayTimeItems ? dayTimeItems.length : 0;
                while (j--) {
                    current = dayTimeItems[j];
                    if (current.stamp) {
                        val = current.date - filter;
                        if (val > _threshold && (!_isUnique || (_isUnique && $.inArray(val, result) === -1))) {
                            result.push(val);
                        }
                    } else {
                        startLimit = _dates[current.start];
                        if (current.start && !startLimit) {
                            startLimit = _dates[current.start] = DateHelpers.parseDateLimitString(current.start);
                        }
                        endLimit = _dates[current.end];
                        if (current.end && !endLimit) {
                            endLimit = _dates[current.end] = DateHelpers.parseDateLimitString(current.end);
                        }
                        isLimited = (!!startLimit && !!endLimit);
                        isTimeInRange = isLimited && ((filter >= startLimit) && (filter <= endLimit));
                        if (!isLimited || isTimeInRange) {
                            val = DateHelpers.getDateDistance(current.day, current.time, filter);
                            if (val > _threshold && (!_isUnique || (_isUnique && $.inArray(val, result) === -1))) {
                                result.push(val);
                            }
                        }
                    }
                }
                return result.sort(function (a, b) {
                    return a - b;
                });
            }
        },
        /**
         * DiscountIntervalProvider Interval iterator allow to calculate and gat update intervals
         */
            DiscountIntervalProvider = can.Construct.extend(
            /**
             * @static
             */
            {

            },
            /**
             * @prototype
             */
            {
                /**
                 * @property set filtering to remove duplicates
                 */
                isUnique: true,
                __distances: [],
                __pairs: {},
                /**
                 * @property  Constant value for not initialized status
                 */
                NOT_INITED: -2,
                /**
                 * @property Provider is empty
                 */
                EMPTY: -3,
                /**
                 *@property  End of intervals array
                 */
                NO_INDEX: -1,
                /**
                 * @property Date for intervals calculation
                 */
                startTime: window.ydDate(),
                state: this.EMPTY,
                parser: parserHelpers.getDiscountsDayTimeItems,
                distanceConverter: intervalsHelper.getTimeDistances,
                currentIndex: 0,
                currentInterval: this.NOT_INITED,
                /**
                 * @property
                 * minimal value for interval all smaller values will be ignored
                 */
                minimalInterval: 10000,// 10sec
                init: function (start, data) {
                    if (start) {
                        this.reset(start, data);
                    }
                },
                reset: function (startDate, data) {
                    var self = this;
                    self.startTime = startDate || window.ydDate();
                    if (data) {
                        self.__distances = {};
                        self.__pairs = {};
                        self.__pairs = this.parser(data, self.__pairs, self.isUnique);
                        self.state = self.NOT_INITED;

                    }
                    if (self.__pairs) {
                        self.__distances = this.distanceConverter(self.startTime, self.__pairs, self.isUnique);
                    }
                    self.currentIndex = 0;
                    self.currentInterval = self.NOT_INITED;
                },
                /**
                 *
                 * @returns {number} Next update interval in milliseconds + move iteration
                 * -1 - Not avaliable next interval
                 * -2 - Not Inited iterator
                 */
                next: function () {
                    var self = this,
                        next = self.currentIndex ,
                        result = self.NOT_INITED,
                        delta = 0,
                        start = (self.currentInterval !== self.NOT_INITED) ? self.__distances[self.currentIndex] : 0;
                    if (self.hasNext()) {
                        do {
                            //steal.dev.log('curr : ' + self.currentIndex + ' next before : ' + next);
                            if (self.currentInterval !== self.NOT_INITED) {
                                next = next + 1;
                            }
                            //steal.dev.log('curr : ' + self.currentIndex + ' next after : ' + next);
                            //debugger;
                            delta = delta + (self.currentInterval !== self.NOT_INITED) ? self.__distances[next] : self.__distances[0];
                            result = delta - start;
                            //steal.dev.log('r : ' + result + ' d: ' + delta + ' s: ' + start + ' n: ' + next + ' c: ' + self.currentIndex);
                        } while (result < self.minimalInterval && self.__distances.length > next);

                        result = (result > self.minimalInterval) ? result : self.NO_INDEX;
                        self.currentIndex = (self.currentInterval !== self.NOT_INITED) ? next : 0;

                        self.currentInterval = result;

                    }
                    else {
                        result = self.NO_INDEX;
                    }
                    return result;
                },
                /**
                 * get interval for particular date
                 * @param date
                 * @returns  {number} Next update interval in milliseconds + move iteration
                 * -1 - Not avaliable next interval
                 * -2 - Not Inited iterator
                 */
                intervalFor: function (date) {
                    var self = this, currentDelta = self.__distances[self.currentIndex],
                        delta = date - self.startTime,
                        result = 0;
                    if (self.currentInterval < 0) {
                        return self.next();
                    }
                    if (currentDelta > delta) {
                        result = currentDelta - delta;
                    }
                    else {
                        // throw error ?!
                        return currentDelta + self.next() - delta;
                    }
                    if (result > self.minimalInterval) {
                        return result;
                    }
                    else {
                        return result + self.next();
                    }
                },
                /**
                 * get refresh interval from now . use this if your function could be called from outside of runner loop
                 * @returns  {number} Next update interval in milliseconds + move iteration
                 * -1 - Not avaliable next interval
                 * -2 - Not Inited iterator
                 */
                nextForNow: function () {
                    return this.intervalFor(window.ydDate());
                },
                /**
                 *
                 * @returns current interval in milliseconds
                 */
                current: function () {
                    return this.currentInterval;
                },
                hasNext: function () {
                    return this.__distances && (this.__distances.length > this.currentIndex + 1);
                },
                isInitialized: function () {
                    return this.state !== this.EMPTY;
                }

            }),
        _serviceOpeningsIntervalProvider = DiscountIntervalProvider.extend({}, {parser: parserHelpers.getOpeningDayTimeItems}),
        publicInterface = {
            dateHelpers: DateHelpers,
            DiscountIntervalProvider: DiscountIntervalProvider,
            ServiceOpeningsIntervalProvider: _serviceOpeningsIntervalProvider,
            // for unit testing part
            ___parserHelpers: parserHelpers,
            ___intervalsHelper: intervalsHelper
        };

    Yd.Helpers = Yd.Helpers || {};

    can.extend(Yd.Helpers, publicInterface);
    return publicInterface;
});

