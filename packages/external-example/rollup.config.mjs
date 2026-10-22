import { resolve } from 'node:path';
import engine262Compiler, {
  createTypeScriptProjectService,
} from '@engine262/babel-compiler';
import { babel } from '@rollup/plugin-babel';
import { defineConfig } from 'rollup';

const project = createTypeScriptProjectService(resolve(import.meta.dirname, 'tsconfig.json'));

export default defineConfig({
  input: resolve(import.meta.dirname, 'src/index.mts'),
  external: ['@engine262/engine262'],
  plugins: [
    watchTypeScriptProject(),
    babel({
      babelHelpers: 'bundled',
      babelrc: false,
      configFile: false,
      extensions: ['.mts'],
      sourceMaps: true,
      plugins: [
        '@babel/plugin-transform-explicit-resource-management',
        [engine262Compiler, { project }],
      ],
      presets: ['@babel/preset-typescript'],
    }),
  ],
  output: {
    file: resolve(import.meta.dirname, 'dist/index.mjs'),
    format: 'es',
    sourcemap: true,
  },
});

function watchTypeScriptProject() {
  return {
    name: '@engine262/typescript-project',
    buildStart() {
      for (const fileName of project.getWatchFileNames()) this.addWatchFile(fileName);
    },
    watchChange(id) {
      project.invalidateFile(id);
    },
    closeWatcher() {
      project.dispose();
    },
  };
}
