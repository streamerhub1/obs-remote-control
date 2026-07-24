import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/out/**',
      '**/node_modules/**',
      'apps/desktop/dist-electron/**',
      'apps/desktop/dist-react/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      'no-empty': 'warn',
      'no-case-declarations': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // React
  {
    files: [
      'apps/website/**/*.tsx',
      'apps/website/**/*.ts',
      'apps/desktop/src/renderer/**/*.tsx',
      'apps/desktop/src/renderer/**/*.ts',
    ],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  // Node globals for backend & packages
  {
    files: [
      'apps/backend/**/*.ts',
      'packages/**/*.ts',
      'apps/desktop/src/main/**/*.ts',
      'apps/desktop/src/preload/**/*.ts',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
