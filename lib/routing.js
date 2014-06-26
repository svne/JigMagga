// TODO: do we still need this?
(function () {
    if(window.location){
        var hash = decodeURIComponent(window.location.hash);
        if (hash.search(/\?(.*)\=/) !== -1) {
            window.location.replace(window.location.href.replace(/#(.*)/, '') + '#!' + hash.split("?")[0].replace(/[!#&]/g, ''));
        }
    }
})();
steal('can/util', 'can/route', function () {
    (function (namespace) { // Closure to protect local variable "var hash"
        if ('replaceState' in history) { // Yay, supported!
            namespace.replaceHash = function (newhash) {
                newhash = newhash.search(/^\#\!/) === -1 ? ('#!' + newhash) : newhash;
                history.replaceState('', '', newhash);
            }
        } else {
            namespace.replaceHash = function (newhash) {
                newhash = newhash.search(/(^\#\!)|(^\#)/) === -1 ? ('#!' + newhash) : newhash;
                var locationHref = window.location.href.replace(/#(.*)/, '');
                window.location.replace(locationHref + newhash);
            };
        }

        if (!window.location.hash && window.document.body && window.document.body.getAttribute &&  window.document.body.getAttribute('data-pagename') !== 'index') {
            namespace.replaceHash('');
        }

        // hack to check if routing of can was initialized correctly
        can.checkRoutingInitialized = function (wait) {
            namespace.setTimeout(function () {
                if (namespace.location.hash && namespace.location.hash.length > 2 && can.isEmptyObject(can.route.attr())) {
                    can.route.setState();
                }
            }, wait || 800);
        };
    })(window);
});
