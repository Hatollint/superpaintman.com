/*!
 * Copyright (C) 2017 SuperPaintman
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
/** Requires */
const fs                    = require('fs');
const path                  = require('path');

const webpack               = require('webpack');
const CleanWebpackPlugin    = require('clean-webpack-plugin');
const HtmlWebpackPlugin     = require('html-webpack-plugin');
const ExtractTextPlugin     = require('extract-text-webpack-plugin');
const ImageminPlugin        = require('imagemin-webpack-plugin').default;

const yaml                  = require('js-yaml');

const p                     = require('./package.json');


/** Constants */
const IS_PRODUCTION     = process.env.NODE_ENV === 'production';

const stylesPath        = path.join(__dirname, 'src/styles/');
const imagesPath        = path.join(__dirname, 'src/images/');

const outputPath        = path.join(__dirname, 'public');

const templatePath      = path.join(__dirname, 'src/templates/views/index.pug');

const locals = yaml.load(
  fs.readFileSync(path.join(__dirname, './config.yml')).toString()
);


/** Helpers */
function filterNull(array) {
  return array.filter((item) => item !== null);
}

function only(isIt, fn, fall) {
  if (!isIt) {
    return fall !== undefined ? fall() : null;
  }

  return fn();
}

const onlyProd = (fn, fall) => only(IS_PRODUCTION, fn, fall);
const onlyDev = (fn, fall) => only(!IS_PRODUCTION, fn, fall);


module.exports = {
  entry: {
    main: path.join(__dirname, 'src/js/index.js')
  },
  output: {
    path: outputPath,
    filename: `js/[name]${onlyProd(() => '.[chunkhash]', () => '')}.js`,
    chunkFilename: `js/[name]${onlyProd(() => '.[chunkhash]', () => '')}.chunk.js`,
    sourceMapFilename: '[file].map',
    publicPath: '/'
  },
  devtool: onlyDev(() => 'source-map', () => ''),
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      styles: stylesPath
    }
  },
  plugins: filterNull([
    /** DefinePlugin */
    new webpack.DefinePlugin({
      IS_PRODUCTION:  JSON.stringify(IS_PRODUCTION),
      VERSION:        JSON.stringify(p.version),
      LOCALS:         JSON.stringify(locals),
      'process.env': {
        NODE_ENV:       JSON.stringify(process.env.NODE_ENV)
      }
    }),

    /** JavaScript */
    onlyProd(() => new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      },
      comments: false
    })),

    /** Clean */
    new CleanWebpackPlugin([outputPath]),

    /** Images */
    onlyProd(() => new ImageminPlugin({
      test: /\.(jpe?g|png|gif|svg)$/
    })),

    /** Template */
    new HtmlWebpackPlugin({
      title:    locals.title,
      counters: locals.counters,
      seo:      locals.seo,
      template: templatePath
    }),

    /** CSS */
    new ExtractTextPlugin({
      filename: `css/[name]${onlyProd(() => '.[chunkhash]', () => '')}.css`
    }),

    /** Chunks */
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: 'vendor',
    //   minChunks: (module) => /node_modules/.test(module.resource)
    // }),
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: 'commons'
    // })
  ]),
  devServer: {
    contentBase: outputPath,
    compress: true,
    port: 8080,
    inline: true,
    watchOptions: {
      aggregateTimeout: 300,
      poll: true,
      ignored: /node_modules/
    }
  },
  module: {
    rules: [
      /** Pug */
      {
        test: /\.pug$/,
        exclude: /node_modules/,
        loader: 'pug-loader'
      },

      /** Images */
      {
        test: (path) => path.indexOf(imagesPath) === 0,
        loader: 'file-loader',
        options: {
          name: `[path][name]${onlyProd(() => '.[sha256:hash]', () => '')}.[ext]`
        }
      },

      /** CSS */
      {
        test: /\.styl$/,
        exclude: /node_modules/,
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            'css-loader',
            'stylus-loader'
          ]
        })
      },

      /** JavaScript */
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  }
};