const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const fs = require('fs')
const marked = require('marked');

// configure marked
marked.setOptions({
    highlight: (code, language) => {
        const hljs = require('highlight.js');
        const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
        return hljs.highlight(validLanguage, code).value;
    }
})
// compile html for each post
post_compilers = fs.readdirSync('./posts')
	.filter(f => f.endsWith('.md'))
    .map(f => new HtmlWebpackPlugin({
            filename: f.split('.md')[0] + '.html',
            template: './templates/post.pug',
            templateParameters: { fs: fs, markdown: marked, filename: f }
    }))


module.exports = {
    entry: './src/main.js',
    mode: 'development',
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: './templates/index.pug',
            templateParameters: { fs: fs, markdown: marked }
        }),
    ].concat(...post_compilers), // combine pre-defined compilers for each post
    module: {
        rules: [
            {
                test: /\.pug$/,
                use: 'pug-loader'
            },
        ]
    }
};
