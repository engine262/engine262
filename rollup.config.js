'use strict';

const fs = require('fs');
const babel = require('rollup-plugin-babel');
const { name, version } = require('./package.json');

const { USE_DO_EXPRESSIONS } = process.env;

const banner = `/*
 * engine262 ${version}
 *
 * ${fs.readFileSync('./LICENSE', 'utf8').trim().split('\n').join('\n * ')}
 */
`;

module.exports = () => ({
  external: ['acorn'],
  input: './src/api.mjs',
  plugins: [
    babel({
      exclude: 'node_modules/**',
      plugins: [
        USE_DO_EXPRESSIONS ? './transform_do.js' : './transform.js',
      ],
    }),
  ],
  acornInjectPlugins: USE_DO_EXPRESSIONS ? [
    (P) => class ParserWithDoExpressions extends P {
      parseExprAtom(...args) {
        if (this.value === 'do') {
          this.next();
          const node = this.startNode();
          node.body = this.parseBlock();
          return this.finishNode(node, 'DoExpression');
        }
        return super.parseExprAtom(...args);
      }
    },
  ] : [],
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
    warn(warning);
  },
});
