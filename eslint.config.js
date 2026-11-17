import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['dist', 'node_modules', '.data', 'coverage'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // JSX usage isn't tracked without the React plugin; ignore capitalised names
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    // Server, build and test code runs in Node
    files: ['server/**', 'api/**', 'scripts/**', 'tests/**', 'vite/**', 'vite.config.js', 'middleware.js', 'shared/**', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
]
