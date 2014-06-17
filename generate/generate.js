module.exports = {
    project: function (namespace) {
        // TODO: fail if folder with namespace exists
        // put namespace into .gitignore
        // create folder with the name namespace
        // inside create folders "jig", "page" and "fixture"
        // inside "page" create a conf json file with the parameter "namespace" set to namespace
        // inside "page" create a folder called "default"
        // inside "default" create a page called "index" (this.page(namespace, "index"))
        // insite fixture create "fixtures.js" by template
        console.log(namespace);
    },
    repository: function (namespace, name) {
        // TODO: fail if namespace folder is in git
        // create a repository from the namespace called "name"
        console.log(namespace, name);
    },
    domain: function (namespace, name) {
        // TODO: fail if the domain name exists in locale and in page
        // create a folder called name in locales and page
        // create a conf file in page/domain as the template
        console.log(namespace, name);
    },
    locale: function (namespace, name, domain) {
        // TODO: fail if the locale/domain exists in namespace or if the domain doesn't exists
        // create a folder in namespace called "locales" if it doesn't exist
        // create a folder in locales called domain if it doesn't exist
        // insite create a header.po and a messages.po with the same content having "locale" set to locale, see template
        console.log(namespace, domain, name);
    },
    page: function (namespace, name, domain) {
        // TODO: fail if the page/domain/page exists in namespace
        // create page by template in page/domain
        // insert page in "pages" object in domain config with the corrently available locales
        console.log(namespace, domain, name);
    },
    model: function (namespace, name) {
        // TODO: fail if the model exists in "models"
        // create model by template in "models"
        console.log(namespace, name);
    },
    jig: function (namespace, name, page) {
        // TODO: fail if the jig exists in "jig"
        // create jig by template in "jig"
        // insert config by template into page/<domain>/<domain>.conf
        console.log(namespace, page, name);
    }
}