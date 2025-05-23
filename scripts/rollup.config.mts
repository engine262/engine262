import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { babel, type RollupBabelInputPluginOptions } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { defineConfig, type Plugin } from 'rollup';
import packageJson from '../package.json' with { type: 'json' };

const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

const banner = `/*!
 * engine262 ${packageJson.version} ${commitHash}
 *
 * ${readFileSync('./LICENSE', 'utf8').trim().split('\n').join('\n * ')}
 */
`;

const babelOptions: RollupBabelInputPluginOptions = {
  babelHelpers: 'bundled',
  exclude: 'node_modules/**',
  generatorOpts: {
    importAttributesKeyword: 'with',
  },
  presets: [[
    '@babel/preset-env',
    {
      // this includes at least 1 LTS for Node.js
      targets: ['last 2 node versions'],
      spec: true,
      bugfixes: true,
    },
  ], [
    '@babel/preset-typescript',
    {
      allowDeclareFields: true,
    },
  ]],
  extensions: ['.mts'],
};

export default defineConfig([
  {
    input: 'lib-src/inspector/index.mts',
    plugins: [
      babel(babelOptions),
      {
        name: 'resolve-self',
        resolveId(source, _importer, _options) {
          if (source === '#self') {
            return { id: './engine262.mjs' };
          }
          return undefined;
        },
      },
      {
        name: 'dts',
        buildStart() {
          this.emitFile({
            type: 'asset',
            fileName: 'inspector.d.ts',
            source: 'export * from "../lib/inspector/index.d.mts";',
          });
          this.emitFile({
            type: 'asset',
            fileName: 'inspector.d.mts',
            source: 'export * from "../lib/inspector/index.d.mts";',
          });
        },
      },
    ],
    external: ['./engine262.mjs'],
    output: [
      {
        file: 'lib/inspector.js',
        format: 'umd',
        sourcemap: true,
        name: `${packageJson.name}/inspector`,
        banner,
        globals: { './engine262.mjs': '@engine262/engine262' },
      },
      {
        file: 'lib/inspector.mjs',
        format: 'es',
        sourcemap: true,
        banner,
      },
    ],
  },
  {
    input: './src/index.mts',
    plugins: [
      importUnicodeLib(),
      (json.default || json)({ compact: true }),
      (commonjs.default || commonjs)(),
      nodeResolve({ exportConditions: ['rollup'], extensions: ['.mts'] }),
      babel({
        ...babelOptions,
        plugins: [
          './scripts/transform.mts',
          ['@babel/plugin-proposal-decorators', {
            'version': '2023-11',
          }],
        ],
      }),
      {
        name: 'dts',
        buildStart() {
          this.emitFile({
            type: 'asset',
            fileName: 'engine262.d.ts',
            source: 'export * from "../declaration/index.d.mjs";',
          });
          this.emitFile({
            type: 'asset',
            fileName: 'engine262.d.mts',
            source: 'export * from "../declaration/index.d.mjs";',
          });
        },
      },
    ],
    output: [
      {
        file: 'lib/engine262.js',
        format: 'umd',
        sourcemap: true,
        name: packageJson.name,
        banner,
      },
      {
        file: 'lib/engine262.mjs',
        format: 'es',
        sourcemap: true,
        banner,
      },
    ],
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY' || warning.code === 'SOURCEMAP_BROKEN') {
        // Squelch.
        return;
      }
      process.exitCode = 1;
      warn(warning);
    },
  }]);

/**
 * Special handle of the following modules so we don't need to import the whole zlib polyfill.
 */
function importUnicodeLib(): Plugin {
  const canImport = ['@unicode/unicode-16.0.0/Case_Folding/C/symbols.js', '@unicode/unicode-16.0.0/Case_Folding/S/symbols.js'];
  return {
    name: '@unicode lib import',
    async transform(code, id) {
      if (!id.includes('node_modules/@unicode')) {
        return { code, map: this.getCombinedSourcemap() };
      }
      if (canImport.some((i) => id.endsWith(i))) {
        const module = createRequire(import.meta.url)(id) as Map<string, string>;
        const codePointsInArray = Array.from(module.entries()).map(([str, str2]) => {
          const it1 = str[Symbol.iterator]();
          const it2 = str2[Symbol.iterator]();
          it1.next();
          it2.next();
          if (!it1.next().done || !it2.next().done) {
            throw new Error(`TODO: handle something strange: ${str} ${str2}`);
          }
          return [str.codePointAt(0), str2.codePointAt(0)];
        });
        const str = JSON.stringify(JSON.stringify(codePointsInArray));
        return `export default new Map(JSON.parse(${str}).map(([cp1, cp2]) => [String.fromCodePoint(cp1), String.fromCodePoint(cp2)]));`;
      }
      return code;
    },
  };
}
