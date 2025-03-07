import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { hash } from 'node:crypto';
import { createRequire } from 'node:module';
import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { defineConfig, type Plugin } from 'rollup';
import packageJson from './package.json' with { type: 'json' };

const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

const banner = `/*!
 * engine262 ${packageJson.version} ${commitHash}
 *
 * ${readFileSync('./LICENSE', 'utf8').trim().split('\n').join('\n * ')}
 */
`;

export default defineConfig({
  input: './src/api.mts',
  plugins: [
    importUnicodeLib(),
    (json.default || json)({ compact: true }),
    (commonjs.default || commonjs)(),
    nodeResolve({ extensions: ['.mts', '.json'] }),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      generatorOpts: {
        importAttributesKeyword: "with"
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
      plugins: [
        './scripts/transform.js',
        ['@babel/plugin-proposal-decorators', {
          'version': '2023-11',
        }],
      ],
    }),
  ],
  output: [
    {
      file: 'dist/engine262.js',
      format: 'umd',
      sourcemap: true,
      name: packageJson.name,
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
    if (warning.code === 'CIRCULAR_DEPENDENCY' || warning.code === 'SOURCEMAP_BROKEN') {
      // Squelch.
      return;
    }
    process.exitCode = 1;
    warn(warning);
  },
});

/**
 * Special handle of the following modules so we don't need to import the whole zlib polyfill.
 */
function importUnicodeLib(): Plugin {
  const [fileNameA, fileNameB] = ['@unicode/unicode-16.0.0/Case_Folding/C/symbols.js', '@unicode/unicode-16.0.0/Case_Folding/S/symbols.js'];
  const [hashA, hashB] = ['Y4mI6wUmO1aHLjYZkH+utkuQVxFS5HeXEDwnwoaBdzU=', 'VIOpuUn8/ZxKqIXbr1/9Fd6qJ05HW5VaUg+fsdsi72g='];
  return {
    name: '@unicode lib import',
    async transform(code, id) {
      if (!id.includes('node_modules/@unicode')) {
        return code;
      }
      const isA = id.endsWith(fileNameA);
      const isB = id.endsWith(fileNameB);
      if (isA || isB) {
        const fileContent = await readFile(id, 'utf8');
        const fileHash = hash('sha256', fileContent, 'base64');
        if (isA && fileHash !== hashA) {
          throw new Error(`Hash mismatch for ${fileNameA}: expected ${hashA}, got ${fileHash}`);
        } else if (isB && fileHash !== hashB) {
          throw new Error(`Hash mismatch for ${fileNameB}: expected ${hashB}, got ${fileHash}`);
        }
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
