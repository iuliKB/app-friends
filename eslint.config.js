// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const noHardcodedStyles = require('./eslint-rules/no-hardcoded-styles');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    plugins: {
      campfire: {
        rules: {
          'no-hardcoded-styles': noHardcodedStyles,
        },
      },
    },
    rules: {
      'campfire/no-hardcoded-styles': 'warn',
    },
  },
  {
    // Exempt token definition files from the hardcoded styles rule
    files: ['src/theme/**/*.ts'],
    rules: {
      'campfire/no-hardcoded-styles': 'off',
    },
  },
]);
