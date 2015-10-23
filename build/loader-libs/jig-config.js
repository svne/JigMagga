var JIG_CONFIG_FIELDS = ['controller','template','options','path','includes','render','prerender'];

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
    var includes = this.includes;
    if (this.path) {
        addDependencyCb(this.path);
    }

    if (this.template) {
        addDependencyCb(this.template);
    }

    if (includes) {
        switch (typeof includes) {
            case 'string':
                addDependencyCb(includes);
                break;
            case 'object':
                if (includes.length > 0) {
                    includes.forEach(function(include){
                        addDependencyCb(include);
                    });
                }
        }
    }
};

module.exports = JigConfig;