if (!steal.config("isBuild")) {
    steal('can/util', {id: "/yd/library/less/less-engine.js", ignore: true}, function () {
        if (steal.isRhino && window.less) {
            (function (tree) {
                var oldProto = tree.URL.prototype;
                tree.URL = function (val, paths) {
                    if (val.data) {
                        this.attrs = val;
                    } else {
                        this.value = val;
                        this.paths = paths;
                    }
                };
                tree.URL.prototype = oldProto;
            })(less.tree);
        }
        steal.type("less css", function (options, success, error) {
            var pathParts = (options.src + '').split('/'),
                lessText = "";
            pathParts[pathParts.length - 1] = ''; // Remove filename

            var paths = [];
            if (!steal.isRhino) {
                var pathParts = (options.src + '').split('/');
                pathParts[pathParts.length - 1] = ''; // Remove filename
                paths = [pathParts.join('/')];
            }
            can.each(steal.Yd.less, function (v, k) {
                lessText += "@" + k + ": " + v + ";\n";
            });
            options.text = lessText + options.text;
            new (less.Parser)({
                optimization: less.optimization,
                paths: [pathParts.join('/')]
            }).parse(options.text, function (e, root) {
                    options.text = root.toCSS();
                    success();
                });
        });
    });
}