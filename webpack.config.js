const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './audio.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // Clean the output directory before emit
  },
  mode: 'production',
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      inject: 'body',
      minify: {
        collapseWhitespace: true,
        removeComments: true, // This is good, but might remove license comments? Usually fine for app.
        removeRedundantAttributes: true,
        useShortDoctype: true,
      }
    }),
    new CopyPlugin({
      patterns: [
        { from: 'styles.css', to: 'styles.css' },
        { from: 'assets', to: 'assets' },
      ],
    }),
    // Custom plugin to remove the dev script tag from the production HTML
    {
      apply: (compiler) => {
        compiler.hooks.compilation.tap('RemoveDevScript', (compilation) => {
          HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
            'RemoveDevScript',
            (data, cb) => {
              // Remove the direct reference to audio.js used in dev
              data.html = data.html.replace(/<script src="audio.js"><\/script>/g, '');
              cb(null, data);
            }
          );
        });
      },
    },
  ],
};
