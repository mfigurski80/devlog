const HtmlWebpackPlugin = require('html-webpack-plugin');
const PugPlugin = require('pug-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const fs = require('fs')
const marked = require('marked');

// date config
const dateFile = fs.readFileSync('./posts/.date', 'utf8').split('\n');
const getDate = (filename) => {
  const set = dateFile.filter(f => f.split('=')[0] === filename);
  if (set.length !== 0) return new Date(set[0].split('=')[1]);
  const stat = fs.statSync('./posts/' + filename);
  return new Date(stat.birthtime);
}

// configure marked for highlighting
marked.setOptions({
  highlight: (code, language) => {
    const hljs = require('highlight.js');
    const hljsDefineSolidity = require('highlightjs-solidity');
    hljsDefineSolidity(hljs);
    const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
    return hljs.highlight(validLanguage, code).value;
  }
})

// compile html for each post
const post_compilers = fs.readdirSync('./posts')
  .filter(f => f.endsWith('.md'))
  .map(f => {
    return new HtmlWebpackPlugin({
      filename: f.split('.md')[0] + '.html',
      template: './templates/post.pug',
      templateParameters: { fs: fs, markdown: marked, filename: f, date: getDate(f) }
    })
  });

module.exports = {
  entry: './src/main.js',
  mode: 'development',
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'assets', to: 'assets' },
      ],
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './templates/index.pug',
      templateParameters: { fs: fs, markdown: marked, getDate }
    }),
  ].concat(...post_compilers), // combine pre-defined compilers for each post
  module: {
    rules: [
      {
        test: /\.pug$/,
        use: PugPlugin.loader,
      },
    ]
  },
  devServer: {
    port: 8080,
    watchFiles: ['src/**/*', 'templates/**/*', 'posts/**/*'],
  },
};
