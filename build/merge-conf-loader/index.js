"use strict";

var maggaMerge = require('magga-merge'),
	loaderUtils = require("loader-utils"),
	PageConfig = require('loader-libs/page-config'),

	fs = require('fs'),
	path = require('path'),
	_ = require('lodash');




module.exports = function(source) {
	var callback = this.async(),
		self = this,
		query = loaderUtils.parseQuery(self.query),
		config;

	console.log('query ',query);
	if (query) {
		config = {};
		config.basePath = query.base ? path.resolve(query.base) : undefined;
		config.defaultPath = query.default ? path.resolve(query.default) : undefined;
	}

	console.log('configuration ',config);
	if (self.resourcePath.search(/(\.conf)$/) !== -1)  {

		this.cacheable && this.cacheable();
		maggaMerge(
			self.resourcePath,
			config,
			function (err, data) {
				callback(err, data);
			}
		);
	}

};