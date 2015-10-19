var webpack = require("webpack");
module.exports = {
  resolve: {
    root: __dirname,
    alias: {
      // This way we can steal("can") even though what we actually have in
      // node_modules is canjs
      "can": "canjs",
      "jquery/jstorage": __dirname + "/bower_components/jstorage",
      "can": __dirname + "/bower_components/canjs/steal/canjs",
      "jquery": __dirname + "/bower_components/jquerypp",
      "core": __dirname + "/core"
    }
  },
  plugins: [
    // This prevents webpack from compiling every single .js file in the source
    // tree just because someone decided to do a dynamic require (which canjs
    // does).
    // Just ignore the critical dependencies warning you see.
    new webpack.ContextReplacementPlugin(/canjs/, /^$/)
  ],
  module: {
    loaders: [{
      test: /\.js$/,
      loader: "destealify"
    }, {
      test: /(\.conf)$/,
      loader: "conf-loader"
    }, {
      test: /(\.stache|\.ejs|\.mustache)$/,
      loader: "conf-loader"
    }, {
      test: /\.scss$/,
      loaders: ['style', 'css', 'sass']
    }]
  }
};