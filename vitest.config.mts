import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    watch: {
      followSymlinks: false,
    },
  },
  test: {
    exclude: ['website/lib/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/inspector/',
      include: ['lib-src/inspector/**', 'lib/inspector.mjs'],
    },
  },
});
