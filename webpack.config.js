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

// one pug entry per post, each pointed at the shared post.pug template
// with its own markdown filename passed through the loader resourceQuery
const post_entries = fs.readdirSync('./posts')
  .filter(f => f.endsWith('.md'))
  .reduce((entries, f) => {
    entries[f.split('.md')[0]] = `./templates/post.pug?filename=${f}`;
    return entries;
  }, {});

module.exports = {
  entry: {
    index: './templates/index.pug',
    ...post_entries,
  },
  mode: 'development',
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'assets', to: 'assets' },
      ],
    }),
    new PugPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.pug$/,
        loader: PugPlugin.loader,
        options: {
          data: { fs, markdown: marked, getDate },
        },
      },
    ]
  },
  devServer: {
    port: 8080,
    watchFiles: ['src/**/*', 'templates/**/*', 'posts/**/*'],
  },
};
