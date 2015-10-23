module.exports = function(source) {
	var callback = this.async();

	if (this.resourcePath.search(/(\.stache|\.mustache|\.ejs)$/) !== -1) {
	
		var compiler = require('can-compile');
		var options = {
			filename: this.resourcePath,
			version: '2.1.3'
		};

		compiler.compile(options, function(err, output) {
			if(err) return callback(err);
			callback(null,
				"steal('can/view/ejs','can/view/mustache',function(can){"+output+"});\n");
		});

	} 


};