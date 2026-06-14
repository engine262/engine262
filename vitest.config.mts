import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    watch: {
      followSymlinks: false,
    },
  },
  test: {
    exclude: ['**/website/lib/engine262/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/inspector/',
      include: ['lib-src/inspector/**', 'lib/inspector.mjs'],
    },
  },
});
