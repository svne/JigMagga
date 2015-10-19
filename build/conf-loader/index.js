module.exports = function(source) {
	var callback = this.async();

	if (this.resourcePath.search(/(\.conf)$/) !== -1)  {

		var config = null;

		try{
			config = JSON.parse(source);
		}catch(e){
			callback(new Error("Config parse error:" + this.resourcePath));
			return;
		}

		console.log(config);
		//TODO config-merge module luisa (maybe extra loader module)
		//TODO steal-type/conf implementation 

		callback(null, "require('" + process.cwd() + "/yd/jig/plz/plz.js');");
	}



};