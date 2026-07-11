import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';
import engine262 from './test/eslint-plugin-engine262/lib/index.mjs';

const project = [
  './src/tsconfig.json',
  './test/tsconfig.json',
  './test/eslint-plugin-engine262/tsconfig.json',
  './scripts/tsconfig.json',
  './lib-src/node/tsconfig.json',
  './lib-src/inspector/tsconfig.json',
];

const projectRules = {
  '@engine262/mathematical-value': 'error',
  'arrow-parens': ['error', 'always'],
  'brace-style': ['error', '1tbs', { allowSingleLine: false }],
  "curly": ['error', 'all'],
  'import-x/order': ['error', { 'newlines-between': 'never' }],
  'import-x/no-extraneous-dependencies': ['error', {
    devDependencies: true,
    packageDir: import.meta.dirname,
  }],
  'no-multiple-empty-lines': ['error', { maxBOF: 0, max: 2 }],
  'no-empty': ['error', { allowEmptyCatch: true }],
  'quote-props': ['error', 'consistent'],
  "strict": ['error', 'global'],
  'default-param-last': 'off',
  'no-constructor-return': 'off',
  'no-constant-condition': 'off',
  'no-loop-func': 'off',
  'no-useless-assignment': 'off',
  'no-use-before-define': 'off',
  'require-yield': 'off',
};

export default defineConfig([
  globalIgnores([
    '**/lib/**',
    'bin/engine262.mjs',
    'test/engine262/fixture/**',
    'test/test262/test262/**',
    'test/json/JSONTestSuite/**',
    'website/**',
  ]),
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@engine262': engine262,
      'import-x': importX,
    },
    rules: {
      ...projectRules,
      'no-unused-vars': ['error', {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      }],
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,mts,cts}'],
  })),
  {
    files: ['**/*.{ts,mts,cts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project,
      },
    },
    plugins: {
      '@engine262': engine262,
      'import-x': importX,
    },
    rules: {
      ...projectRules,
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-fallthrough': 'off',
      'no-dupe-class-members': 'off',
      "curly": 'off',
      "yoda": 'off',
      'no-shadow': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-this-alias': 'off',
    },
  },
  {
    files: ['src/**/*.mts'],
    rules: {
      '@engine262/safe-function-with-q': 'error',
      '@engine262/no-floating-generator': 'error',
    },
  },
]);
