import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';

export default (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: path.resolve(path.dirname(new URL(import.meta.url).pathname), 'src', 'index.jsx'),
    output: {
      path: path.resolve(path.dirname(new URL(import.meta.url).pathname), 'dist'),
      filename: isDev ? 'js/bundle.js' : 'js/bundle.[contenthash].js',
      publicPath: '/',
      clean: true
    },
    resolve: {
      extensions: ['.js', '.jsx']
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: 'babel-loader'
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: 'asset',
          parser: { dataUrlCondition: { maxSize: 8 * 1024 } },
          generator: { filename: 'assets/images/[name][hash][ext][query]' }
        },
        {
          test: /\.(woff2?|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: { filename: 'assets/fonts/[name][hash][ext][query]' }
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(path.dirname(new URL(import.meta.url).pathname), 'public', 'index.html')
      })
    ],
    devtool: isDev ? 'eval-source-map' : 'source-map',
    devServer: {
      static: { directory: path.resolve(path.dirname(new URL(import.meta.url).pathname), 'public') },
      historyApiFallback: true,
      port: 5173,
      open: false,
      hot: true,
      compress: true,
      client: { overlay: true }
    },
    optimization: {
      splitChunks: { chunks: 'all' },
      runtimeChunk: 'single'
    },
    performance: { hints: false }
  };
};