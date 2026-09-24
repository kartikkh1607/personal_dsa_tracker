import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Components are only referenced from JSX, which core ESLint doesn't count as a use.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Core no-undef doesn't look inside JSX either, so a component used but
      // never imported only showed up as a crash in the browser.
      'react/jsx-no-undef': 'error',
    },
  },
  {
    files: ['public/sw.js'],
    languageOptions: { sourceType: 'script', globals: globals.serviceworker },
  },
  {
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Browser tests run in node and drive a browser, rather than running in one.
    files: ['e2e/**/*.js'],
    languageOptions: { globals: globals.node },
  },
]
