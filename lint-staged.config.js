const defaultSettings = ['prettier --write', 'git add'];

const jsLintCommand = 'eslint --ext .js,.jsx --cache';
const tsLintCommand = 'tslint -p tsconfig.json';
const cssLintCommand = 'stylelint --cache';

const jsSettings = [...defaultSettings, jsLintCommand];

const tsSettings = [...defaultSettings, tsLintCommand];

const cssSettings = [cssLintCommand];

module.exports = {
  'src/**/*.{js,jsx}': jsSettings,
  'src/**/*.{ts,tsx}': tsSettings,
  'src/**/*.css': cssSettings,
};
