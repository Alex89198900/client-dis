const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',

  devServer: {
    contentBase: path.resolve(__dirname, './dist'),
    allowedHosts: 'all',
    port: 3000,
    historyApiFallback: true,
    hot: true,
    proxy: {
      '/socket.io': {
        target: 'https://server-dis.onrender.com',
        ws: true,
        rejectUnauthorized: false,
      },
    },
  },
};
