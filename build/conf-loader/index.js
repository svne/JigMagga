"use strict";

var JIG_CONFIG_FIELDS = ['controller','template','options','path','includes','render'],
	maggaMerge = require('magga-merge'),
	path = require('path');


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
		jigConfigs = [];

	if (this.resourcePath.search(/(\.conf)$/) !== -1)  {

		var config = null;

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

		// gathering information about jigs
		if (config.jigs) {
			Object.keys(config.jigs).forEach(function(jigName){
				var newJig = new JigConfig(jigName, config.jigs[jigName]);
				newJig.print();
				jigConfigs.push(newJig);
			});
		}

		jigConfigs.forEach(function(jigConfig){
			jigConfig.process(function(dep){
				callbackStrings.push("require('" + process.cwd() +"/"+ dep+"');");
			});

		});
		console.log('[CONF_LOADER] Going to require files:\n%s',callbackStrings.join('\n'));
		callback(null,callbackStrings.join('\n'));

	}

};