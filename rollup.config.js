'use strict';

const fs = require('fs');
const { execSync } = require('child_process');
const { default: babel } = require('@rollup/plugin-babel');
const commonjs = require('@rollup/plugin-commonjs');
const { default: nodeResolve } = require('@rollup/plugin-node-resolve');

// import of JSON files is disallowed in native ES Modules:
const {
  name,
  version,
  main: outCommonJS,
  module: outESModule,
} = JSON.parse(fs.readFileSync('./package.json', { encoding: 'utf8' }));

const hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

const banner = `\
/*!
 * engine262 ${version} ${hash}
 *
 * ${fs.readFileSync('./LICENSE', 'utf8').trim().split('\n').join('\n * ')}
 */
`;

module.exports = () => ({
  input: './src/api.mjs',
  plugins: [
    commonjs(),
    nodeResolve(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      plugins: [
        '@babel/plugin-syntax-bigint',
        './scripts/transform.js',
      ],
    }),
  ],
  output: [
    {
      file: outCommonJS,
      format: 'umd',
      sourcemap: true,
      name,
      banner,
    },
    {
      file: outESModule,
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
