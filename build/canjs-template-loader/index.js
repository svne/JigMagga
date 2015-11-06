function parsePathToAlias(self) {
	//"/home/jarosla/JigMagga/yd/jig/services/views/friendscount.ejs" -> "yd_jig_services_views_friendscount_ejs"
	var result = self.resourcePath.replace(self.options.context,'').replace(/^\//,'').replace(/[\/\.]/g,'_');
	console.log('**%s***',result);
	return result;
}

module.exports = function(source) {
	var callback = this.async(),
		self =  this;



	if (this.resourcePath.search(/(\.stache|\.mustache|\.ejs)$/) !== -1) {
	
		var compiler = require('can-compile');
		var options = {
			filename: this.resourcePath,
			version: '2.1.3'
		};


		compiler.compile(options, function(err, output) {
			if(err) return callback(err);
			callback(null,
				"steal('can/view/ejs','can/view/mustache',function(can){can.view.preload(\""+parsePathToAlias(self)+"\","+output+")});\n");
//			"require('can/view/ejs'); require('can/view/mustache');\n"+output+"\n");
		});

	} 


};