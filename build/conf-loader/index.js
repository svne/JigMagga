"use strict";

var JIG_CONFIG_FIELDS = ['controller','template','options','path','includes','render','prerender'],
	PAGE_CONFIG_FIELDS = ['domain','locales','pages','crosslinks','companyinfo'],
	maggaMerge = require('magga-merge'),
	loaderUtils = require("loader-utils"),
	incapsulateCode = require('./incapsulate.js'),

	fs = require('fs'),
	path = require('path'),
	_ = require('lodash');


// Utiling functions from conf.js

var readCookie = function (name) {
	var ck,
		cv,
		i;
//	if (document && document.cookie) {
//		ck = document.cookie.split('; ');
//		for (i = ck.length - 1; i >= 0; i--) {
//			cv = ck[i].split('=');
//			if (cv[0] === name) {
//				return cv[1];
//			}
//		}
//	}
	return undefined;
};


function PageConfig (confObject) {
	var self = this;
	PAGE_CONFIG_FIELDS.forEach(function(key){
		self[key] = confObject[key];
	});
	// gathering information about jigs
	self.jigConfigs = [];
	if (confObject.jigs) {
		Object.keys(confObject.jigs).forEach(function(jigName){
			var newJig = new JigConfig(jigName, confObject.jigs[jigName]);
			newJig.print();
			self.jigConfigs.push(newJig);
		});
	}
}


PageConfig.prototype.printJigs = function (){
	this.jigConfigs.forEach(function(jig){
		console.log(jig.name);
	});
};

PageConfig.prototype.setLocale = function(){
	this._locale = readCookie("reace")|| 'default';

	console.log('PageConfig setLocale',this._locale);
};


function JigConfig(name, options) {
	var self = this;
	self.name = name;
	Object.keys(options).forEach(function(key){
		if (JIG_CONFIG_FIELDS.indexOf(key)!==-1) {
			self[key] = options[key];
		} else {
			console.warn('[new JigConfig()] Unknown option "%s". Ignoring',key);
		}
	});
//	self.children = [];

}

JigConfig.prototype.print = function(){
	var self = this;
	console.log('\nPrinting fields for the entry "%s"',this.name);
	JIG_CONFIG_FIELDS.forEach(function(key){
		if (self[key]) {
			console.log(key+': %s', self[key]);
		}});
};

JigConfig.prototype.process = function(addDependencyCb){
	if (this.path) {
		addDependencyCb(this.path);
	}

	if (this.template) {
		addDependencyCb(this.template);
	}

	if (this.includes && this.includes.length > 0) {
		this.includes.forEach(function(include){
			addDependencyCb(include);
		});
	}


};


module.exports = function(source) {
	var callback = this.async(),
		callbackStrings = [],
		pageConfig,
		domainCfg = null,
		config = null;


	if (this.resourcePath.search(/(\.conf)$/) !== -1)  {

		//TODO config-merge module luisa (maybe extra loader module)
		//TODO steal-type/conf implementation

//		maggaMerge(
//			'yd/page/lieferando.de/index/index.conf',
//
//			function (err, data) {
//				console.log('@@@@@@@@@@@@@@@',data);
//			}
//		);

		try{
			config = JSON.parse(source);
		}catch(e){
			callback(new Error("Config parse error:" + this.resourcePath));
			return;
		}

		//TODO: delete it after fixing magga-merge
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


		// set locales
		pageConfig.setLocale();


		// load all includes
		// load all jigs
		pageConfig.jigConfigs.forEach(function(jigConfig){
			jigConfig.process(function(dep){
				callbackStrings.push("require('" + process.cwd() +"/"+ dep+"');");
			});

		});

		// check if jigs should be rendered
		// instantiate jigs



		this.addDependency(path.resolve('./incapsulate.js'));
//		callbackStrings.push("require('" + loaderUtils.stringifyRequest(this, incapsulateCode)+"');");
		console.log('[CONF_LOADER] Going to require files:\n%s',callbackStrings.join('\n'));
		callback(null,callbackStrings.join('\n'));

	}

};