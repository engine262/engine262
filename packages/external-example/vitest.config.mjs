import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.mts'],
    exclude: ['node_modules/**'],
  },
});
