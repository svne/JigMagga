/**
 * TODO config should not be in this upper scope.
 * Better is to use as an argument in the view helper functions that need the configuration.
 */


var config = null;

var viewHelperObject = {
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

        locale = locale || config.locale;

        if (!config.pages[link]) {
            for (key in config.pages) {
                if (key.search("/" + link) !== -1) {
                    link = key;
                }
            }
        }

        if (typeof steal !== "undefined" && steal.config().env === 'development') {
            resultUrl = location.pathname.replace(/(.*\.[a-z]{2,3}\/).*/, "$1" + link + "/" + link.replace(/^.*\//, "") + ".html");
        } else if (config.pages[link]) {
            if (config.pages[link][locale]) {
                resultUrl = config.pages[link][locale];
            } else {
                resultUrl = config.pages[link][Object.keys(config.pages[link])[0]];
            }
            if (targetUrl) {
                resultUrl = resultUrl.replace("{url}", targetUrl);
            }
        }
        return resultUrl;
    },
    staticLink: function (link, locale) {
        return viewHelperObject.pageLink(link, undefined, locale);
    }
};

if (typeof module !== "undefined") {
    module.exports = function (res) {
        config = res;
        return viewHelperObject;
    };
}

if (typeof steal !== "undefined") {
    steal(function() {
        config = steal.config()[steal.config().namespace];
        return viewHelperObject;
    });

}
