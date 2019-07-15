module.exports = function override(config, env) {
  console.log(config.module.rules[config.module.rules.length - 1]);
  //do stuff with the webpack config...

  // exclude *.glsl from file-loader
  config.module.rules[config.module.rules.length - 1].oneOf.unshift(
    {
      test: /\.glsl$/,
      use: 'raw-loader',
    },
    {
      test: /\.worker$/,
      use: 'comlink-loader',
    },
  );

  return {
    ...config,
    output: {
      ...config.output,
      globalObject: 'this'
    },
  };
};
