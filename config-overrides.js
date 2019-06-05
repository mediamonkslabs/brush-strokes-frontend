module.exports = function override(config, env) {
  //do stuff with the webpack config...
  return {
    ...config,
    output: {
      ...config.output,
      globalObject: 'this'
    },
    module: {
      ...config.module,
      rules: [
        {
          test: /\.worker$/,
          use: [
            { loader: 'comlink-loader' }
          ],
        },
        ...config.module.rules,
      ]
    }
  };
};