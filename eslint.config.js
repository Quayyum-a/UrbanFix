// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  // React Native <Text> renders quotes and apostrophes literally; this rule is for HTML.
  { rules: { 'react/no-unescaped-entities': 'off' } },
  { ignores: ['dist/*', 'node_modules/*', '.expo/*', 'assets/_old_placeholders/*'] },
  { files: ['__tests__/**', 'database/test/**'], languageOptions: { globals: { jest: 'readonly' } } },
  { files: ['database/test/*.js', '*.config.js'], languageOptions: { globals: { __dirname: 'readonly', require: 'readonly', module: 'writable', process: 'readonly' } } },
])
