'use strict';

const fs = require('fs').promises;
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const nodeModules = path.resolve(rootDir, 'node_modules');
const unicodeDir = path.resolve(nodeModules, '@unicode', 'unicode-13.0.0');
const outFile = path.resolve(rootDir, 'src', 'data-gen.json');

async function* scan(d) {
  for await (const dirent of await fs.opendir(d)) {
    if (dirent.isDirectory()) {
      const p = path.join(d, dirent.name);
      const test = path.join(p, 'code-points.js');
      try {
        await fs.stat(test);
        yield p;
      } catch {
        yield* scan(p);
      }
    }
  }
}

(async () => {
  const data = {};

  for await (const item of scan(unicodeDir)) {
    const category = path.relative(unicodeDir, item).replace(/\\/g, '/');
    // eslint-disable-next-line import/no-dynamic-require
    const cps = require(`@unicode/unicode-13.0.0/${category}/code-points.js`);
    if (!Array.isArray(cps)) {
      continue;
    }
    const ranges = [];
    let from = 0;
    let to = 0;
    cps.forEach((cp, i) => {
      if (i === 0) {
        from = cp;
        to = cp;
      } else {
        if (to + 1 === cp) {
          to += 1;
        } else {
          ranges.push([from, to]);
          from = cp;
          to = cp;
        }
      }
    });
    ranges.push([from, to]);
    data[category] = ranges;
  }

  await fs.writeFile(outFile, JSON.stringify(data));
})();
