'use strict';
var _ = require('lodash');
var util = require('util');

var appender = require('./appender'),
    domPrepender = require('./domPrepender'),
    prepender = require('./prepender');


/**
 * get the amount of tags at the page
 * @param <string> selector
 * @param <string> page
 * @return {number|null}
 */
var getTagCount = function (selector, page) {
    if (selector.charAt(0) === '.') {
        selector = selector.slice(1, selector.length);
    }

    var countTags = new RegExp('<[^\\s>]*\\s[^>]*class=[\'"][^\'"]*\\b' + selector + '[\\s|\'"][^>]*>', 'ig');
    var result = page.match(countTags);

    return result && result.length ? result.length : null;
};

/**
 * check whether all the tags that could be found by selector are empty
 * @param <string> selector
 * @param <string> page
 * @return {boolean}
 */
var isAllParentEmpty = function (selector, page) {
    if (selector.charAt(0) === '.') {
        selector = selector.slice(1, selector.length);
    }

    //regexp that finds tags by selector without content
    var countEmptyTag = new RegExp('<[^\\s>]*\\s[^>]*class=[\'"][^\'"]*\\b' + selector + '[\\s|\'"][^>]*>[\\s]*<\/[\\w]+>', 'ig');

    var tagsCount = getTagCount(selector, page);
    var emptyTags = page.match(countEmptyTag);

    if (!emptyTags || !tagsCount) {
        return false;
    }

    return emptyTags.length === tagsCount;
};

/**
 * check if there is only one selector in string
 * @param {string} selector
 * @return {boolean}
 */
var isOneSelector = function (selector) {
    var regExp = new RegExp('\\s', 'ig');
    return !regExp.test(selector.trim());
};

// strategy of tag insertion
var strategyCheckers = {
    simplePrepend: {
        check: function (slot) {
            return slot.insertAsChild === 'prepend' && isOneSelector(slot.parent);
        },
        action: function (slot) {
            slot.invoke = prepender.invoke;
        }
    },
    // if parent is empty we have to get all slots that is about to append to this parent
    // and change it is order in oder to use prepend instead of append
    appendToEmpty: {
        check: function (slot, page) {
            return slot.insertAsChild !== 'prepend' &&
                isAllParentEmpty(slot.parent, page) &&
                isOneSelector(slot.parent);
        },
        action: function (slot, jigSelectr, config) {

            this.list[slot.parent] = this.list[slot.parent] || [];
            slot.invoke = prepender.invoke;

            this.list[slot.parent].unshift(config[jigSelectr]);
        },
        list: {}
    },
    appendToNotEmpty: {
        check: function (slot, page) {
            return slot.insertAsChild !== 'prepend' &&
                !isAllParentEmpty(slot.parent, page) &&
                isOneSelector(slot.parent);
        },
        action: function (slot) {
            slot.invoke = appender.invoke;
        }
    },
    selectorInsert: {
        check: function (slot) {
            return !isOneSelector(slot.parent);
        },
        action: function (slot) {
            slot.invoke = slot.insertAsChild === 'prepend' ? domPrepender.invoke : appender.invoke;
        }
    }
};

/**
 * analyze config pick insert strategy for each jig and create a list of jigs with strategies
 * @param {object} config
 * @param {string} page
 * @return {Array}
 */
var mapJigsWithStrategy= function (config, page) {

    var result = [];
    _.each(config, function (jig, className) {
        if (_.isObject(jig.slot) && jig.controller) {

            _.some(strategyCheckers, function (checker, checkerName) {
                if (checker.check(jig.slot, page)) {
                    checker.action(jig.slot, className, config);
                    jig.slot.strategy = checkerName;
                    jig.jigClassName = className;
                    return true;
                }
            });

            // don't add jigs that have appendToEmpty strategy because it will ne added in
            //indirect order lately
            if (jig.slot.strategy !== 'appendToEmpty') {
                result.push(jig);
            }
        }
    });

    if (_.keys(strategyCheckers.appendToEmpty.list).length) {
        var appendToEmptyList = _.flatten(_.values(strategyCheckers.appendToEmpty.list));
        result = result.concat(appendToEmptyList);
    }

    return result;
};


/**
 * create a section tag that have to be inserted inside the tag
 * @param {object} jig
 * @return {string}
 */
var createSection = function (jig) {
    var classes = jig.slot.classes || [];
    var classWithoutDot = jig.jigClassName.replace(/^\./, '');

    if (classes.indexOf(classWithoutDot) === -1) {
        classes.push(classWithoutDot);
    }

    if (jig.controller) {
        classes.push(jig.controller.toLowerCase().replace(/\./g, '-'));
    }

    return util.format('<section class="%s"></section>', classes.join(' '));
};


/**
 * analyze config create a list of jig with insertion strategy for each one
 * use invoke function of each jig returns an html with inserted section
 *
 * @param {object} config
 * @param {string} page
 * @return {string}
 */
exports.executeJigSlotLogic = function (config, page) {
    var jigs = mapJigsWithStrategy(config, page);
    jigs.forEach(function (jig) {
        var section = createSection(jig);

        page = jig.slot.invoke(page, jig.slot.parent, section);
    });

    return page;
};