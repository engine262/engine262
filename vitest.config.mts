import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['website/lib/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/inspector/',
      include: ['lib-src/inspector/**', 'lib/inspector.mjs'],
    },
  },
});
