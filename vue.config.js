// vue.config.js

/**
 * @type {import('@vue/cli-service').ProjectOptions}
 */
module.exports = {
  devServer: {
    port: 3000,
    watchOptions: {
      poll: true,
    },
  },
  publicPath: "./",
};
