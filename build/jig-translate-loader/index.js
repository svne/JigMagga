"use strict";

var loaderUtils = require('loader-utils'),
	prepareGettext = require('jig-gettext-translate').prepareGettext,
	transformFn = require('replace-gettext-underscore'),
	path = require('path');



module.exports = function(source) {
	var callback = this.async(),
		self = this,
		query = loaderUtils.parseQuery(self.query),
		output,
		gettext;

	query = query || {};
	query.path = query.path || 'yd/locales' ;
	query.locale = query.locale || 'de_DE';
	query.domain = query.domain || 'lieferando.de';

//	self.cacheable && self.cacheable();

	gettext = prepareGettext(query.domain, query.locale, query.path);
	output = transformFn(source, gettext);
	if (source.search("yd-jig-noscript-text") !== -1) {
		console.log (self.resourcePath,'\n',output);
	}
	callback(null,  output );
};