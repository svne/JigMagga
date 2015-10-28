var webpack = require("webpack"),
    SassVars = JSON.stringify({
      "yd-domain":"lieferando_de",
      "yd-assetdomain": "",
      "yd-locale":"de_DE",
      "yd-mobile":"false",
      "yd-dev":"false",
      "yd-pagetype": "default",
      "yd-satellites ":"false"
    });



module.exports = {
  resolve: {
//    root: __dirname,
    modulesDirectories: ["node_modules","bower_components",'./'],
    alias: {
      // This way we can steal("can") even though what we actually have in
      // node_modules is canjs
//      "can": "canjs",
//      "can-cjs": __dirname+"/node_modules/can/dist/cjs/can.js",
      "jquery/jstorage": "jstorage",
      "can": __dirname + "/bower_components/canjs/steal/canjs",
      "cancjs": __dirname + "/node_modules/can/dist/cjs/can.js",
      "jquery": __dirname + "/bower_components/jquerypp",
      "core": __dirname + "/core"
//      "steal": __dirname+"/steal/steal.js"

    }
  },
  plugins: [
    // This prevents webpack from compiling every single .js file in the source
    // tree just because someone decided to do a dynamic require (which canjs
    // does).
    // Just ignore the critical dependencies warning you see.
    new webpack.ContextReplacementPlugin(/canjs/, /^$/),
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
      "window.$": "jquery", //NOTE this is for jStorage. maybe it is possible to make it with imports-loader
//      "can": "cancjs"
//      "steal": "steal"
    })
  ],
  module: {
    loaders: [{
//      test: /yd(?:jig|page).*\.js$/,
      test: /\.js$/,
      loaders: ["regexp","destealify"],
      rules: [
        {
          'for': new RegExp('^\\s*\/\/!steal-remove-start(\\n|.)*?\/\/!steal-remove-end.*$', 'gm'),
          'do': ''
        }
      ]
    }, {
      test: /(\.conf)$/,
      loaders: ["parse-conf","merge-conf"]
    }, {
      test: /(\.stache|\.ejs|\.mustache)$/,
      loaders: ['destealify','canjs-template']
    }, {
      test: /\.scss$/,
      loaders: ['style', 'css', 'sass','jsontosass?'+SassVars]
    }]
  }
};