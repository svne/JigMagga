"use strict";

var maggaMerge = require('magga-merge'),
	loaderUtils = require("loader-utils"),
	PageConfig = require('loader-libs/page-config'),

	fs = require('fs'),
	path = require('path'),
	_ = require('lodash');




module.exports = function(source) {
	var callback = this.async(),
		callbackStrings = [],
		pageConfig,
		config = null,
		self = this;

	config = source;
	console.log('@@@@@@@@@@@@@@@', config);
	pageConfig = new PageConfig(config);
	pageConfig.printJigs();

	// load all includes
	// load all jigs
	pageConfig.jigConfigs.forEach(function(jigConfig){
		callbackStrings = callbackStrings.concat(jigConfig.getResourceList(pageConfig.isBuild)
			.map(function(resource){
				return "require('" + path.resolve(resource)+"');";
			}));
		// TODO: add watch and hop swat functionality somewhere here
//				self.addDependency(path.resolve(dep));
	});

	// add legacy staff
	callbackStrings.push("require('"+path.resolve('lib/lib.js')+"');");

//				pageConfig.getIncludes().forEach(function(uri){
//					callbackStrings.push('require("'+uri+'");');
//				});


//		// add export of the configuration object
//		callbackStrings.push();

	// just for some control
	['namespace','locales'].forEach(function(key){
		console.log(key+" is ",config[key]);
	});

	console.log('CanRoutes:\n',pageConfig.getCanRoutesText());

	console.log('AllocateJigs:\n',pageConfig.getAllocateJigsText());

//		console.log('[CONF_LOADER] sending to callback:\n%s',callbackStrings.join('\n'));
//		callback(null,);
	callback(null, "exports = module.exports = {\n"+
		"config:" + JSON.stringify(config)+",\n"+
		"requireIncludes: function(){\n"+ pageConfig.getIncludesText()+"\n},\n"+
		"requirePageDeps: function(){\n"+ callbackStrings.join('\n')+"\n},\n"+
		"addCanRoutes: function(){\n"+ pageConfig.getCanRoutesText()+"\n},\n"+
		"allocateJigs: function(){\n"+ pageConfig.getAllocateJigsText()+"\n}\n}"
	);
};