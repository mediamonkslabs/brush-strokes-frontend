module.exports = function override(config, env) {
  config.module.rules[config.module.rules.length - 1].oneOf.unshift({
    test: /\.glsl$/,
    loader: 'raw-loader',
  });

  config.module.rules[config.module.rules.length - 1].oneOf.unshift({
    test: /\.worker\.(j|t)s$/,
    include: config.module.rules[config.module.rules.length - 1].oneOf[1].include,
    use: [
      {
        loader: 'workerize-loader',
        options: {
          ready: true
        }
      },
    ],
  });

  return {
    ...config,
    output: {
      ...config.output,
      globalObject: 'this',
    },
  };
};
