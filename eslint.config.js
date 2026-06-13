// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const globals = require('globals');
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
      'campfire/no-hardcoded-styles': 'error',
    },
  },
  {
    // Exempt token definition files from the hardcoded styles rule
    files: ['src/theme/**/*.ts'],
    rules: {
      'campfire/no-hardcoded-styles': 'off',
    },
  },
  {
    // Jest globals for test files and mocks (jest.fn/mock, describe, expect…)
    files: ['**/__tests__/**', '**/*.test.{ts,tsx,js,jsx}', 'src/__mocks__/**'],
    languageOptions: {
      globals: globals.jest,
    },
  },
]);
