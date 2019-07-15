module.exports = function override(config, env) {
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
