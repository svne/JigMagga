module.exports = {
    // Todo: general placeholders:
    // placeholders are the three variables "namespace", "name" and "page"
    // the placeholders "namespace" and "name" also exist in the uppercase form of the first letter "Namespace", "Name"
    // "page" and "name" can contain slashes (folders). To get the parts of the folders we have f.e. "nameFirst" (first folder), "nameLast" (last folder), "nameEnd" (all without fist folder). same for "page"
    project: function (namespace) {
        // TODO: fail if folder with namespace exists
        // put namespace into .gitignore
        // create folder with the name namespace
        // inside create folder "page"
        // inside "page" create a conf json file with the parameter "namespace" set to namespace (like in templates)
        // inside "default" create a page called "index" (call this.page(namespace, "index", "default"))
        console.log(namespace);
    },
    repository: function (namespace, name) {
        // TODO: fail if namespace folder is in git
        // create a repository from the namespace called "name"
        console.log(namespace, name);
    },
    domain: function (namespace, name) {
        // TODO: fail if the domain name exists in locale and in page
        // create a folder called name in "page"
        // create a conf file in "page"/domain as the template
        console.log(namespace, name);
    },
    locale: function (namespace, name, domain) {
        // TODO: fail if the locale/domain exists in namespace or if the domain doesn't exists
        // create a folder in namespace called "locales" if it doesn't exist
        // create a folder in locales called domain if it doesn't exist
        // inside namespace/"page"/domain/domain".conf" add the key "locales" if it doesn't exists and inside the array of locales add the locale
        // example: "locales": ["de_DE", "en_EN"]
        // inside create a header.po and a messages.po with the same content having "locale" set to locale, see template
        console.log(namespace, domain, name);
    },
    page: function (namespace, name, domain) {
        // TODO: fail if the page/domain/page exists in namespace
        // create page by template in namespace/"page"/domain
        // remember that the name can contain slashes = folders
        // insert page in "pages" object in domain".conf" with the currently available locales
        // examples:
        // "agb": {"de_DE": "/agb", "en_EN": "/en/agb"} -> put in the locales in the given order, put the language part of the locale in front of the pagename as a path, but dont do that for the main locale
        // "index": {"de_DE": "/", "en_EN": "/en/"} -> if the pagename is "index" strip the pagename out of the path
        console.log(namespace, domain, name);
    },
    model: function (namespace, name) {
        // TODO: fail if the model exists in "models"
        // create a folder called "models" in the namespace
        // create a folder called fixture in the namespae
        // create a model by template in "models"
        // inside fixture create "fixtures.js" by template
        // add this to the page.conf includes (create includes if not available):
        // "includes": [{ "id": "//<%= namespace %>/fixture/fixtures.js", "ignore" : true}],
        console.log(namespace, name);
    },
    jig: function (namespace, name, domain) {
        // TODO: fail if the jig exists in "jig"
        // create a folder called "jig" in the namespace if it doesn't exists
        // create jig by template in "jig"
        // creaate jig section in page/<domain>/<domainLast>.conf
        // insert config for the jig into the config
        // example:
        // "<%= namespace %>-jig-<%= name %>": {
        //      "controller": "<%= Namespace %>.Jig.<%= Name %>",  // notice the uppercase namespace!
        //      "template": "<%= namespace %>/jig/<%= name %>/views/init.mustache",
        //      "options": {},
        //      "render": true,
        //      "prerender": true
        // }
        console.log(namespace, domain, name);
    }
}