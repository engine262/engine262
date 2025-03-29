import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['lib-src/inspector/**', 'lib/inspector.mjs'],
    },
  },
});
