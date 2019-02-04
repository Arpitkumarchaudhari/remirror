const { resolve } = require('path');
const localConfig = require('./.babelrc');

const workingDir = (path = '') => resolve(__dirname, path);

const babelConfig = {
  ...localConfig,
  plugins: [...localConfig.plugins, process.env.COVERAGE ? 'istanbul' : false].filter(Boolean),
};

module.exports = {
  title: 'Docz Typescript',
  typescript: true,
  modifyBabelRc(config) {
    return babelConfig;
  },
  modifyBundlerConfig: config => {
    config.module.rules.push({
      test: /\.tsx?$/,
      loader: 'babel-loader',
      options: babelConfig,
      include: [workingDir('../@remirror'), /@remirror/],
    });

    return config;
  },
};
