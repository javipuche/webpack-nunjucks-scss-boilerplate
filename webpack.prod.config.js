const merge = require('webpack-merge');
const baseConfig = require('./webpack.base.config.js');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ImageminPlugin = require('imagemin-webpack-plugin').default;
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const HtmlBeautifyPlugin = require('html-beautify-webpack-plugin');

module.exports = merge(baseConfig, {
    mode: 'production',
    optimization: {
        minimizer: [
            new UglifyJSPlugin({
                parallel: true,
                uglifyOptions: {
                    output: {
                        comments: false
                    }
                }
            })
        ],
    },
    plugins: [
        new ImageminPlugin({
            test: /\.(jpe?g|png|gif|svg)$/i,
            optipng: null,
            jpegtran: null,
            plugins: [
                imageminMozjpeg({
                    quality: 60,
                    progressive: true
                }),
                imageminPngquant({
                    quality: 95
                })
            ]
        }),
        new HtmlBeautifyPlugin({
            config: {
                html: {
                    end_with_newline: true,
                    indent_size: 4,
                    indent_with_tabs: true,
                    indent_inner_html: true,
                    preserve_newlines: false,
                    unformatted: ['i', 'strong', 'p > span', 'p > a']
                }
            }
        })
    ]
});