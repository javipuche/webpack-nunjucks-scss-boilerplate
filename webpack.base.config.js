const fs = require('fs');
const webpack = require('webpack');
const path = require('path');
const merge = require('webpack-merge');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const nunjucks = require('nunjucks');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const wait = require('wait-for-stuff');
const isProduction = process.argv.indexOf('production') >= 0;
const basePath = __dirname;
const srcPath = 'src';
const distPath = 'dist';
const publicPath = '/';


// Functions
// -----------------------------------------------------------------------------

function walkSync(dir, filelist) {
    files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist);
        } else {
            filelist.push(path.join(dir, file));
        }
    });
    return filelist;
}


// Common config
// -----------------------------------------------------------------------------

module.exports = {
    stats: {
        colors: true,
        timings: true,
        children: false,
    },
    performance: {
        hints: false
    },
    context: path.join(basePath, srcPath),
    entry: {
        main: [
            'assets/js/main.js',
            'assets/scss/main.scss'
        ],
    },
    output: {
        path: path.join(basePath, distPath),
        filename: 'assets/js/[name].js',
        publicPath: publicPath
    },
    resolve: {
        extensions: ['*', '.js', '.json', '.scss', '.html', '.njk'],
        alias: {
            node_modules: path.join(basePath, 'node_modules'),
            data: path.join(basePath, `${srcPath}/data`),
            assets: path.join(basePath, `${srcPath}/assets`),
            modules: path.join(basePath, `${srcPath}/assets/js/modules`),
            layouts: path.join(basePath, `${srcPath}/templates/layouts`),
            pages: path.join(basePath, `${srcPath}/templates/pages`),
            partials: path.join(basePath, `${srcPath}/templates/partials`),
        }
    },
    module: {
        rules: [{
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            },
            {
                test: /\.(gif|png|jpe?g|svg)$/i,
                exclude: /(a-z A-Z 0-9)*\/(font?s)\//,
                use: [{
                        loader: 'file-loader',
                        options: {
                            name: 'assets/img/[name].[ext]'
                        },
                    },
                    {
                        loader: 'image-webpack-loader',
                        options: {
                            bypassOnDebug: true,
                        },
                    },
                ],
            },
            {
                test: /\.(eot|ttf|svg|woff|woff2)$/i,
                exclude: /(a-z A-Z 0-9)*\/(img|image?s)\//,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: 'assets/fonts/[name].[ext]'
                    },
                }],
            },
            {
                test: /\.njk$/,
                use: [{
                    loader: 'render-template-loader',
                    options: {
                        engine: function(input, locals, engineOptions) {
                            var env = nunjucks.configure([path.join(basePath, `${srcPath}/templates`)]);

                            let result = wait.for.promise(new Promise((resolve, reject) => {
                                env.renderString(input, locals, function (err, res) {
                                    if (err) {
                                        reject(err);
                                    }
                                    resolve(res);
                                });
                            }).then((outputHtml) => {
                                return outputHtml;
                            }));

                            if (typeof result === 'object') {
                                throw new Error(result);
                            }

                            return result;
                        },
                        locals: merge({
                            root: publicPath,
                        }, function () {
                            const templateDir = path.join(basePath, `${srcPath}/data`);
                            const allFiles = walkSync(templateDir);
                            const files = fs.readdirSync(path.resolve(__dirname, templateDir));
                            let obj = {};

                            allFiles.forEach(function(item) {
                                const dir = item.substring(0, item.lastIndexOf("/"));
                                const dirOutput = dir.split(templateDir.split('./')[1])[1];
                                const file = item.substring(item.lastIndexOf('/') + 1);
                                const name = file.split('.')[0];
                                const extension = file.split('.')[1];

                                if (name && extension == 'json') {
                                    obj[name] = require(`${dir}/${name}.${extension}`);
                                }
                            });
                            return obj;
                        }())
                    }
                }],
            },
            {
                test: /\.(css|scss)$/,
                use: [
                    'style-loader',
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            config: {
                                path: path.join(basePath, 'postcss.config.js')
                            }
                        }
                    },
                    'sass-loader'
                ]
            },
        ],
    },
    optimization: {
        minimize: true,
        splitChunks: {
            cacheGroups: {
                vendor: {
                    chunks: 'all',
                    minChunks: 2,
                    name: 'vendor',
                    test: /[\\/]node_modules[\\/]/
                }
            }
        },
        runtimeChunk: false
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new CopyWebpackPlugin([{
            from: 'assets/img/**/*.{jpg,jpeg,png,gif,svg}',
        }, {
            from: 'assets/fonts/**/*.{eot,ttf,svg,woff,woff2}',
        }, {
            from: 'static',
            to: 'static'
        }]),
        new MiniCssExtractPlugin({
            filename: 'assets/css/[name].css'
        })
    ]
    .concat(function () {
        const templateDir = `${srcPath}/templates/pages`;
        const templates = walkSync(templateDir);
        const templateFiles = fs.readdirSync(path.resolve(__dirname, templateDir));

        return templates.map((item, key) => {
            const dir = item.substring(0, item.lastIndexOf("/"));
            const dirOutput = dir.split(templateDir)[1];
            const file = item.substring(item.lastIndexOf('/') + 1);
            const name = file.split('.')[0];
            const extension = file.split('.')[1];

            return new HtmlWebpackPlugin({
                filename: dirOutput ? `.${dirOutput}/${name}.html` : `${name}.html`,
                template: path.resolve(__dirname, `./${dir}/${name}.${extension}`)
            });
        });
    }())
    .concat([
        new ScriptExtHtmlWebpackPlugin({
            defaultAttribute: 'defer'
        })
    ])
};