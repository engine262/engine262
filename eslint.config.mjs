import { resolve } from 'node:path';
import engine262 from '@engine262/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const project = [
  './src/tsconfig.json',
  './test/tsconfig.json',
  './packages/babel-compiler/tsconfig.json',
  './packages/babel-compiler/tsconfig.test.json',
  './packages/eslint-plugin/tsconfig.json',
  './packages/eslint-plugin/tsconfig.test.json',
  './packages/external-example/tsconfig.json',
  './packages/external-example/tsconfig.test.json',
  './scripts/tsconfig.json',
  './lib-src/node/tsconfig.json',
  './lib-src/inspector/tsconfig.json',
];

const projectRules = {
  'arrow-parens': ['error', 'always'],
  'brace-style': ['error', '1tbs', { allowSingleLine: false }],
  "curly": ['error', 'all'],
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

const disableTypeScriptEslintRules = Object.fromEntries(
  Object.keys(tseslint.plugin.rules).map((rule) => [`@typescript-eslint/${rule}`, 'off']),
);

export default defineConfig([
  globalIgnores([
    '**/lib/**',
    '**/dist/**',
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
    },
    settings: {
      engine262: {
        compiler: true,
        internals: '#self',
        valueDefinitionPath: resolve(import.meta.dirname, 'src/value.mts'),
      },
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
    files: ['src/**/*.mts', 'lib-src/**/*.mts'],
    rules: {
      '@engine262/gc-mark-complete': 'error',
      '@engine262/record-class': 'error',
      '@engine262/gc-captures': 'error',
      '@engine262/q-macro': 'error',
      '@engine262/no-floating-evaluator': 'error',
    },
  },
  {
    files: ['packages/eslint-plugin/test/**/*.{ts,mts,cts}'],
    rules: disableTypeScriptEslintRules,
  },
]);
