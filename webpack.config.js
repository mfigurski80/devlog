const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    entry: './src/main.js',
    mode: 'development',
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: './templates/index.pug',
            templateParameters: { fs: require('fs'), markdown: require('marked') }
        }),
    ],
    module: {
        rules: [
            {
                test: /\.pug$/,
                use: 'pug-loader'
            },
        ]
    }
};