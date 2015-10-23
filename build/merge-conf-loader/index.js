"use strict";

var maggaMerge = require('magga-merge'),
	loaderUtils = require("loader-utils"),
	PageConfig = require('../loader-libs/page-config.js'),

	fs = require('fs'),
	path = require('path'),
	_ = require('lodash');




module.exports = function(source) {
	var callback = this.async(),
		callbackStrings = [],
		pageConfig,
		pageCfg,
		domainCfg = null,
		config = null,
		self = this;


	if (self.resourcePath.search(/(\.conf)$/) !== -1)  {

		//TODO config-merge module luisa (maybe extra loader module)
		//TODO steal-type/conf implementation


		//TODO when it will work,...
//		maggaMerge(
//			path.resolve(this.resourcePath),
//
//			function (err, data) {
//				config = data;
//				console.log('@@@@@@@@@@@@@@@',data);
//			}
//		);


		//TODO: delete it after fixing magga-merge



		try{
			config = JSON.parse(source);
		}catch(e){
			callback(new Error("Config parse error:" + this.resourcePath));
			return;
		}

		// loading configuration of lieferando.de domain
		try{
			pageCfg = fs.readFileSync(path.join(this.resourcePath,'../../../page.conf'),"utf8");
			pageCfg = JSON.parse(pageCfg);
		}catch(e){
			callback(new Error("pageCfg parse error:" + this.resourcePath));
			return;
		}

		pageCfg.jigs = _.assign({},pageCfg.jigs,config.jigs);

		Object.keys(pageCfg).forEach(function(key){
			config[key] = pageCfg[key];
		});

		// loading configuration of lieferando.de domain
		try{
			domainCfg = fs.readFileSync(path.join(this.resourcePath,'../../lieferando.de.conf'),"utf8");
			domainCfg = JSON.parse(domainCfg);
		}catch(e){
			callback(new Error("Config parse error:" + this.resourcePath));
			return;
		}

		domainCfg.jigs = _.assign({},domainCfg.jigs,config.jigs);

		Object.keys(domainCfg).forEach(function(key){
			config[key] = domainCfg[key];
		});
		// ----------- delete before here here

		pageConfig = new PageConfig(config);

		pageConfig.printJigs();

		// load all includes
		// load all jigs
		pageConfig.jigConfigs.forEach(function(jigConfig){
			jigConfig.process(function(dep){
				callbackStrings.push("require('" + path.resolve(dep)+"');");
				// TODO: add watch and hop swat functionality somewhere here
//				self.addDependency(path.resolve(dep));
			});
		});

//		// add export of the configuration object
//		callbackStrings.push();

		// just for some control
		['namespace','locales'].forEach(function(key){
			console.log(key+" is ",config[key]);
		});

//		console.log('[CONF_LOADER] sending to callback:\n%s',callbackStrings.join('\n'));
//		callback(null,);
		callback(null, "exports = module.exports = {\n"+
			"config:" + JSON.stringify(config)+",\n"+
			"requirePageDeps: function(){\n"+ callbackStrings.join('\n')+"\n}\n}"
		);

	}

};