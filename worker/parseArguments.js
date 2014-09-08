'use strict';

var program = require('commander');

module.exports = function (processArgs) {
    return program
        .option('-c, --cityId <n>', 'define location by cityId', parseInt)
        .option('-s, --regionId <n>', 'define location by regionId', parseInt)
        .option('-o, --districtId <n>', 'define location by districtId', parseInt)
        .option('-l, --linkId <n>', 'define internlinkpage by linkId', parseInt)
        .option('-v, --values [values]', 'specify values as JSON')
        .option('-r, --restaurantId <n>', 'define restaurant by restaurantId', parseInt)
        .option('-R, --satelliteId <n>', 'define restaurant by satelliteId', parseInt)
        .option('-b, --versionnumber [value]', 'specify build version as float')
        .option('-q, --queue', 'start program to listen on queue')
        .option('-e, --errorqueue', 'use error queue')
        .option('-E, --errorerrorqueue', 'use errorerror queue')
        .option('-y, --staticold', 'generate all old static pages (sem)')
        .option('-d, --basedomain [value]', 'specify the domain')
        .option('-p, --page [value]', 'define the template to be generated')
        .option('-k, --childpage [value]', 'define a child page that should overwrite the parent element')
        .option('-x, --live', 'use live db and queue - normally staging is used')
        .option('-X, --liveuncached', 'use live db and uncache queue')
        .option('-u, --url [value]', 'define the url to be generated')
        .option('-H, --highprio', 'use the high priority queue')
        .option('-M, --mediumprio', 'use the high priority queue')
        .option('-L, --lowprio', 'use the high priority queue')
        .option('-V, --postfix', 'use this version postfix queue')
        .option('-I, --locale <n>', 'use given locale')
        .option('-t, --target <n>', 'relative path from current dir to target project')
        .option('-f, --fixtures', 'use fixtures from project folder instead of making an api call')
        .option('-w, --write [value]', 'write to disk the archive with generated files instead of upload them, path should be provided')
        .parse(processArgs);
};