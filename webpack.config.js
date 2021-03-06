/* eslint-disable no-console */
/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

//binhnt: Visualize size of webpack output files with an interactive zoomable treemap.
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
//binhnt: A webpack plugin to remove/clean your build folder(s).
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
//binhnt: Copies individual files or entire directories, which already exist, to the build directory.
const CopyPlugin = require('copy-webpack-plugin');
//binhnt: simplifies creation of HTML files to serve your webpack bundles
const HtmlWebpackPlugin = require('html-webpack-plugin');
//binhnt: This plugin extracts CSS into separate files. It creates a CSS file per JS file which contains CSS. It supports On-Demand-Loading of CSS and SourceMaps.
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
//binhnt: A Webpack plugin to optimize \ minimize CSS assets.
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
//binhnt: This plugin measures your webpack build speed, giving an output 
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
//binhnt: This plugin uses terser to minify your JavaScript.
const TerserPlugin = require('terser-webpack-plugin');
//binhnt: A Webpack plugin for generating an asset manifest.
const ManifestPlugin = require('webpack-manifest-plugin');
//binhnt: Webpack plugin that runs TypeScript type checker on a separate process
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

//binhnt: Yargs helps you build interactive command line tools, by parsing arguments and generating an elegant user interface.
const parsedArgs = require('yargs').argv;

//binhnt: Load proxy config
const getProxyConfig = require('./webpack.proxy-config');
const packageConfig = require('./package.json');

// input dir
const APP_DIR = path.resolve(__dirname, './');

// output dir
const BUILD_DIR = path.resolve(__dirname, './dist');

//binhnt add 
const { createEmotionPlugin } = require('emotion-ts-plugin')


const {
  mode = 'development',
  devserverPort = 9000,
  measure = false,
  analyzeBundle = false,
  analyzerPort = 8888,
  nameChunks = false,
} = parsedArgs;

const isDevMode = mode !== 'production';
const isDevServer = process.argv[1].includes('webpack-dev-server');

const output = {
  path: BUILD_DIR,
  publicPath: '/static/assets/', // necessary for lazy-loaded chunks
};

if (isDevMode) {
  output.filename = '[name].[hash:8].entry.js';
  output.chunkFilename = '[name].[hash:8].chunk.js';
} else if (nameChunks) {
  output.filename = '[name].[chunkhash].entry.js';
  output.chunkFilename = '[name].[chunkhash].chunk.js';
} else {
  output.filename = '[name].[chunkhash].entry.js';
  output.chunkFilename = '[chunkhash].chunk.js';
}

const plugins = [
  // creates a manifest.json mapping of name to hashed output used in template files
  new ManifestPlugin({
    publicPath: output.publicPath,
    seed: { app: 'superset' },
    // This enables us to include all relevant files for an entry
    generate: (seed, files, entrypoints) => {
      // Each entrypoint's chunk files in the format of
      // {
      //   entry: {
      //     css: [],
      //     js: []
      //   }
      // }
      const entryFiles = {};
      Object.entries(entrypoints).forEach(([entry, chunks]) => {
        entryFiles[entry] = {
          css: chunks
            .filter(x => x.endsWith('.css'))
            .map(x => path.join(output.publicPath, x)),
          js: chunks
            .filter(x => x.endsWith('.js'))
            .map(x => path.join(output.publicPath, x)),
        };
      });

      return {
        ...seed,
        entrypoints: entryFiles,
      };
    },
    // Also write maniafest.json to disk when running `npm run dev`.
    // This is required for Flask to work.
    writeToFileEmit: isDevMode && !isDevServer,
  }),

  // expose mode variable to other modules
  new webpack.DefinePlugin({
    'process.env.WEBPACK_MODE': JSON.stringify(mode),
  }),

  // runs type checking on a separate process to speed up the build
  new ForkTsCheckerWebpackPlugin({
    eslint: true,
    checkSyntacticErrors: true,
    memoryLimit: 4096,
  }),

  new CopyPlugin({
    patterns: [
      'package.json',
      { from: 'images', to: 'images' },
      { from: 'stylesheets', to: 'stylesheets' },
    ],
  }),

  // static pages
  new HtmlWebpackPlugin({
    template: './src/staticPages/404.html',
    inject: true,
    chunks: [],
    filename: '404.html',
  }),

  new HtmlWebpackPlugin({
    template: './src/staticPages/500.html',
    inject: true,
    chunks: [],
    filename: '500.html',
  }),
];

//binhnt: Add ProgressPlugin
if (!process.env.CI) {
  plugins.push(new webpack.ProgressPlugin());
}

// clean up built assets if not from dev-server
if (!isDevServer) {
  plugins.push(
    new CleanWebpackPlugin({
      // required because the build directory is outside the frontend directory:
      dangerouslyAllowCleanPatternsOutsideProject: true,
    }),
  );
}

if (!isDevMode) {
  // text loading (webpack 4+)
  plugins.push(
    new MiniCssExtractPlugin({
      filename: '[name].[chunkhash].entry.css',
      chunkFilename: '[name].[chunkhash].chunk.css',
    }),
  );
  plugins.push(new OptimizeCSSAssetsPlugin());
}

const PREAMBLE = [path.join(APP_DIR, '/src/injections/preamble.ts')];

if (isDevMode) {
  // A Superset webpage normally includes two JS bundles in dev, `theme.ts` and
  // the main entrypoint. Only the main entry should have the dev server client,
  // otherwise the websocket client will initialize twice, creating two sockets.
  // Ref: https://github.com/gaearon/react-hot-loader/issues/141
  PREAMBLE.unshift(
    `webpack-dev-server/client?http://localhost:${devserverPort}`,
  );
}

function addPreamble(entry) {
  return PREAMBLE.concat([path.join(APP_DIR, entry)]);
}

//binhnt: Config babel 
const babelLoader = {
  loader: 'babel-loader',
  options: {
    cacheDirectory: true,
    // disable gzip compression for cache files
    // faster when there are millions of small files
    cacheCompression: false,
    plugins: ['emotion'],
    presets: [
      [
        '@emotion/babel-preset-css-prop',
        {
          autoLabel: 'dev-only',
          labelFormat: '[local]',
        },
      ],
    ],
  },
};

//binhnt: Main config
const config = {
  node: {
    fs: 'empty',
  },
  entry: {
    theme: path.join(APP_DIR, '/src/injections/theme/index.ts'),
    preamble: PREAMBLE,
    addSlice: addPreamble('/src/injections/addSlice/index.tsx'),
    dashboard: addPreamble('/src/injections/dashboard/index.jsx'),
    sqllab: addPreamble('/src/injections/SqlLab/index.tsx'),
    sqlsupport: addPreamble('/src/injections/SqlSupport/index.tsx'),
    crudViews: addPreamble('/src/injections/views/index.tsx'),
    menu: addPreamble('src/injections/menu/index.tsx'),
    profile: addPreamble('/src/injections/profile/index.tsx'),
    explore: addPreamble('/src/injections/explore/index.jsx'),
    data_explore: addPreamble('/src/injections/DataExplore/index.jsx'),
    showSavedQuery: [path.join(APP_DIR, '/src/injections/showSavedQuery/index.jsx')],
  },
  output,
  stats: 'verbose',
  performance: {
    assetFilter(assetFilename) {
      // don't throw size limit warning on geojson and font files
      return !/\.(map|geojson|woff2)$/.test(assetFilename);
    },
  },
  optimization: {
    sideEffects: true,
    splitChunks: {
      chunks: 'all',
      // increase minSize for devMode to 1000kb because of sourcemap
      minSize: isDevMode ? 1000000 : 20000,
      name: nameChunks,
      automaticNameDelimiter: '-',
      minChunks: 2,
      cacheGroups: {
        automaticNamePrefix: 'chunk',
        // basic stable dependencies
        vendors: {
          priority: 50,
          name: 'vendors',
          test: new RegExp(
            `/node_modules/(${[
              'abortcontroller-polyfill',
              'react',
              'react-dom',
              'prop-types',
              'react-prop-types',
              'prop-types-extra',
              'redux',
              'react-redux',
              'react-hot-loader',
              'react-select',
              'react-sortable-hoc',
              'react-virtualized',
              'react-table',
              'react-ace',
              '@hot-loader.*',
              'webpack.*',
              '@?babel.*',
              'lodash.*',
              'antd',
              '@ant-design.*',
              '.*bootstrap',
              'react-bootstrap-slider',
              'moment',
              'jquery',
              'core-js.*',
              '@emotion.*',
              'd3',
              'd3-(array|color|scale|interpolate|format|selection|collection|time|time-format)',
            ].join('|')})/`,
          ),
        },
        // bundle large libraries separately
        mathjs: {
          name: 'mathjs',
          test: /\/node_modules\/mathjs\//,
          priority: 30,
          enforce: true,
        },
        // viz thumbnails are used in `addSlice` and `explore` page
        thumbnail: {
          name: 'thumbnail',
          test: /thumbnail(Large)?\.png/i,
          priority: 20,
          enforce: true,
        },
      },
    },
  },
  resolve: {
    modules: [APP_DIR, 'node_modules'],
    alias: {
      'react-dom': '@hot-loader/react-dom',
      // Force using absolute import path of some packages in the root node_modules,
      // as they can be dependencies of other packages via `npm link`.
      // Both `@emotion/core` and `@teko-data-ui/core` remember some globals within
      // module after imported, which will not be available everywhere if two
      // different copies of the same module are imported in different places.
      '@emotion/core': path.resolve(APP_DIR, './node_modules/@emotion/core'),
      '@teko-data-ui/core': path.resolve(
        APP_DIR,
        './node_modules/@teko-data-ui/core',
      ),
      '@teko-data-ui/chart-controls': path.resolve(
        APP_DIR,
        './node_modules/@teko-data-ui/chart-controls',
      ),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    symlinks: false,
  },
  context: APP_DIR, // to automatically find tsconfig.json
  module: {
    // Uglifying mapbox-gl results in undefined errors, see
    // https://github.com/mapbox/mapbox-gl-js/issues/4359#issuecomment-288001933
    noParse: /(mapbox-gl)\.js$/,
    rules: [
      {
        test: /datatables\.net.*/,
        loader: 'imports-loader?define=>false',
      },
      {
        test: /\.tsx?$/,
        exclude: [/\.test.tsx?$/],
        use: [
          'thread-loader',
          babelLoader,
          {
            loader: 'ts-loader',
            options: {
              // transpile only in happyPack mode
              // type checking is done via fork-ts-checker-webpack-plugin
              happyPackMode: true,
              transpileOnly: true,
              // must override compiler options here, even though we have set
              // the same options in `tsconfig.json`, because they may still
              // be overriden by `tsconfig.json` in node_modules subdirectories.
              getCustomTransformers: () => ({
                before: [
                  createEmotionPlugin({
                    // <------------------- here
                    sourcemap: true,
                    autoLabel: true,
                    labelFormat: '[local]',
                    // if the jsxFactory is set, should we auto insert the import statement
                    autoInject: true,
                    // set for react@17 new jsx runtime
                    // only effect if `autoInject` is true
                    // set it in createEmotionPlugin options rather than in `tsconfig.json` will generate more optimized codes:
                    // import { jsx } from 'react/jsx-runtime' for files not using emotion
                    // import { jsx } from '@emotion/react/jsx-runtime' for files using emotion
                    jsxImportSource: '@emotion/react',
                  }),
                ],
              }),
              compilerOptions: {
                esModuleInterop: false,
                importHelpers: false,
                module: 'esnext',
                target: 'esnext',
              },
            },
          },
        ],
      },
      {
        test: /\.jsx?$/,
        // include source code for plugins, but exclude node_modules and test files within them
        exclude: [/teko-data-ui.*\/node_modules\//, /\.test.jsx?$/],
        include: [
          new RegExp(`${APP_DIR}/src`),
          /teko-data-ui.*\/src/,
          new RegExp(`${APP_DIR}/.storybook`),
        ],
        use: [babelLoader],
      },
      {
        test: /\.css$/,
        include: [APP_DIR, /teko-data-ui.+\/src/],
        use: [
          isDevMode ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: isDevMode,
            },
          },
        ],
      },
      {
        test: /\.less$/,
        include: APP_DIR,
        use: [
          isDevMode ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: isDevMode,
            },
          },
          {
            loader: 'less-loader',
            options: {
              sourceMap: isDevMode,
              javascriptEnabled: true,
            },
          },
        ],
      },
      /* binhnt add bootstrap 4.0 */
      {
        test: /\.(scss)$/,
        use: [{
          loader: 'style-loader', // inject CSS to page
        }, {
          loader: 'css-loader', // translates CSS into CommonJS modules
        },
        {
          loader: 'sass-loader' // compiles Sass to CSS
        }]
      },
      /* for css linking images (and viz plugin thumbnails) */
      {
        test: /\.png$/,
        issuer: {
          exclude: /\/src\/staticPages\//,
        },
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: '[name].[hash:8].[ext]',
        },
      },
      {
        test: /\.png$/,
        issuer: {
          test: /\/src\/staticPages\//,
        },
        loader: 'url-loader',
        options: {
          limit: 150000, // Convert images < 150kb to base64 strings
        },
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: {
          test: /\.(j|t)sx?$/,
        },
        use: ['@svgr/webpack'],
      },
      {
        test: /\.(jpg|gif)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[hash:8].[ext]',
        },
      },
      /* for font-awesome */
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'url-loader?limit=10000&mimetype=application/font-woff',
        options: {
          esModule: false,
        },
      },
      {
        test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'file-loader',
        options: {
          esModule: false,
        },
      },
    ],
  },
  externals: {
    cheerio: 'window',
    'react/lib/ExecutionEnvironment': true,
    'react/lib/ReactContext': true,
  },
  plugins,
  devtool: false,
};

let proxyConfig = getProxyConfig();

if (isDevMode) {
  config.devtool = 'eval-cheap-module-source-map';
  config.devServer = {
    before(app, server, compiler) {
      // load proxy config when manifest updates
      const hook = compiler.hooks.webpackManifestPluginAfterEmit;
      hook.tap('ManifestPlugin', manifest => {
        console.log("binhnt: start push ManifestPlugin by hook before start")
        proxyConfig = getProxyConfig(manifest);
      });
    },
    historyApiFallback: true,
    hot: true,
    injectClient: false,
    injectHot: true,
    inline: true,
    stats: 'minimal',
    overlay: true,
    port: devserverPort,
    // Only serves bundled files from webpack-dev-server
    // and proxy everything else to teko-data backend
    proxy: [
      // functions are called for every request
      () => proxyConfig,
    ],
    // contentBase: path.join(process.cwd(), '../static/assets'),
    contentBase: path.join(process.cwd(), './dist'),
  };

  // find all the symlinked plugins and use their source code for imports
  let hasSymlink = false;
  Object.entries(packageConfig.dependencies).forEach(([pkg, version]) => {
    const srcPath = `./node_modules/${pkg}/src`;
    if (/teko-data-ui/.test(pkg) && fs.existsSync(srcPath)) {
      console.log(
        `[Superset Plugin] Use symlink source for ${pkg} @ ${version}`,
      );
      // only allow exact match so imports like `@teko-data-ui/plugin-name/lib`
      // and `@teko-data-ui/plugin-name/esm` can still work.
      config.resolve.alias[`${pkg}$`] = `${pkg}/src`;
      delete config.resolve.alias[pkg];
      hasSymlink = true;
    }
  });
  if (hasSymlink) {
    console.log(''); // pure cosmetic new line
  }
} else {
  config.optimization.minimizer = [
    new TerserPlugin({
      cache: '.terser-plugin-cache/',
      parallel: true,
      extractComments: true,
    }),
  ];
}

// Bundle analyzer is disabled by default
// Pass flag --analyzeBundle=true to enable
// e.g. npm run build -- --analyzeBundle=true
if (analyzeBundle) {
  config.plugins.push(new BundleAnalyzerPlugin({ analyzerPort }));
}

// Speed measurement is disabled by default
// Pass flag --measure=true to enable
// e.g. npm run build -- --measure=true
const smp = new SpeedMeasurePlugin({
  disable: !measure,
});

module.exports = smp.wrap(config);
