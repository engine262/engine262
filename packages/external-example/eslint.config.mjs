import engine262 from '@engine262/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/**', '*.config.mts', '*.config.mjs']),
  tseslint.configs.recommendedTypeChecked,
  {
    files: ['src/**/*.mts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['test/**/*.mts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ...engine262.configs.recommended,
    files: ['src/**/*.mts'],
    settings: {
      engine262: {
        compiler: true,
      },
    },
  }
]);
