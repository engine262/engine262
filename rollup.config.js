'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { babel } = require('@rollup/plugin-babel');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const nodePolyfills = require('rollup-plugin-polyfill-node');
const { name, version } = require('./package.json');

const hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

const banner = `/*!
 * engine262 ${version} ${hash}
 *
 * ${fs.readFileSync('./LICENSE', 'utf8').trim().split('\n').join('\n * ')}
 */
`;

module.exports = () => ({
  input: './src/api.mts',
  plugins: [
    json({ compact: true }),
    commonjs(),
    mtsResolver(),
    nodeResolve(),
    // TODO: src/runtime-semantics/RegExp.mts imported @unicode/unicode-15.0.0 thus imported the full zlib package.
    nodePolyfills(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
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
      extensions: ['.mjs', '.mts'],
      plugins: [
        './scripts/transform.js',
        ['@babel/plugin-proposal-decorators', {
          'version': '2022-03',
        }],
      ],
    }),
  ],
  output: [
    {
      file: 'dist/engine262.js',
      format: 'umd',
      sourcemap: true,
      name,
      banner,
    },
    {
      file: 'dist/engine262.mjs',
      format: 'es',
      sourcemap: true,
      banner,
    },
  ],
  onwarn(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') {
      // Squelch.
      return;
    }
    process.exitCode = 1;
    warn(warning);
  },
});
function mtsResolver() {
  return {
    name: 'mts resolver',
    async resolveId(importee, importer) {
      if (!importee.endsWith('.mjs') || !importer || importee[0] !== '.') {
        return null;
      }
      const resolved = path.resolve(path.dirname(importer), importee);

      return fs.promises.access(resolved, fs.constants.F_OK)
        .then(() => null)
        .catch(() => ({
          id:
            `${resolved.slice(0, -('.mjs'.length))}.mts`,
        }));
    },
  };
}
