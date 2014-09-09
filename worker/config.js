'use strict';

/**
 * returns merged configuration from namespace project that supposed
 * to contain config folder in it. Module could obtain path to the config
 * using NODE_PROJECT_NAME environment variable or if it is not set - using
 * namespace argument of application or just current working directory
 */


var path = require('path');
var parseArguments = require('./parseArguments');

var config;

var pathToConfig;

var program = parseArguments(process.argv);

if (process.env.NODE_PROJECT_NAME) {
    pathToConfig = __dirname + '/../' + process.env.NODE_PROJECT_NAME;
} else {
    pathToConfig = (program.namespace) ? path.join(process.cwd(), program.namespace) : process.cwd();
}


config = require('konphyg')(pathToConfig + '/config');

module.exports = config.all();
