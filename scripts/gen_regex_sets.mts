import {
  opendir, readFile, stat, writeFile,
} from 'node:fs/promises';
import * as path from 'path';

const nodeModules = path.resolve(path.resolve(import.meta.dirname, '..'), 'node_modules');
const unicodeDir = path.resolve(nodeModules, '@unicode', 'unicode-16.0.0');

async function writeUnicodePropertyMapping() {
  async function* scan(d: string): AsyncGenerator<string, void, void> {
    for await (const dirent of await opendir(d)) {
      if (dirent.isDirectory()) {
        const p = path.join(d, dirent.name);
        const test = path.join(p, 'code-points.js');
        try {
          await stat(test);
          yield p;
        } catch {
          yield* scan(p);
        }
      }
    }
  }

  type Range = readonly [from: number, to: number]

  const data: Record<string, readonly Range[]> = {};

  for await (const item of scan(unicodeDir)) {
    const category = path.relative(unicodeDir, item).replace(/\\/g, '/');
    const { default: cps } = await import(`@unicode/unicode-16.0.0/${category}/code-points.js`);
    if (!Array.isArray(cps)) {
      continue;
    }
    if (!category.startsWith('General_Category/') && !category.startsWith('Script/') && !category.startsWith('Script_Extensions/') && !category.startsWith('Binary_Property/')) {
      continue;
    }
    const ranges: Range[] = [];
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
  await writeFile(path.resolve(path.resolve(import.meta.dirname, '..'), 'src/unicode/CodePointProperties.json'), JSON.stringify(data));
}

async function writeUnicodeStringsMapping() {
  const data: Record<string, string> = {};
  for (const cat of [
    'Basic_Emoji',
    'Emoji_Keycap_Sequence',
    'RGI_Emoji_Modifier_Sequence',
    'RGI_Emoji_Flag_Sequence',
    'RGI_Emoji_Tag_Sequence',
    'RGI_Emoji_ZWJ_Sequence',
    'RGI_Emoji',
  ]) {
    const file = path.resolve(unicodeDir, 'Sequence_Property', cat, 'index.js');
    // eslint-disable-next-line no-await-in-loop
    const { default: strings } = await import(file);
    data[cat] = strings.join(',');
  }
  await writeFile(path.resolve(path.resolve(import.meta.dirname, '..'), 'src', 'unicode/SequenceProperties.json'), JSON.stringify(data));
}

async function writeUnicodePropertyAliasMapping() {
  const file = readFile(new URL('./Unicode/PropertyValueAliases.txt', import.meta.url), 'utf-8');
  const lines = (await file).split('\n').filter((line) => line.length > 0 && !line.startsWith('#'));

  const gc: Record<string, string> = {};
  const sc: Record<string, string> = {};
  const scx: Record<string, string> = {};
  // gc ; M                                ; Mark                             ; Combining_Mark
  // where Mark is the official name, I guess?
  for (const line of lines) {
    const [cat, alias, formalName, ...moreAlias] = line
      .split('#')[0]
      .split(';')
      .map((s) => s.trim());
    if (cat === 'gc') {
      gc[alias] = formalName;
      gc[formalName] = formalName;
      moreAlias.forEach((name) => {
        gc[name] = formalName;
      });
    } else if (cat === 'sc') {
      sc[alias] = formalName;
      sc[formalName] = formalName;
      moreAlias.forEach((name) => {
        sc[name] = formalName;
      });
    } else if (cat === 'scx') {
      scx[alias] = formalName;
      scx[formalName] = formalName;
      moreAlias.forEach((name) => {
        scx[name] = formalName;
      });
    }
  }
  await writeFile(
    new URL('../src/unicode/PropertyValueAliases.json', import.meta.url),
    JSON.stringify(
      {
        description:
          'Unicode Property Value Aliases, generated from https://unicode.org/Public/UCD/latest/ucd/PropertyValueAliases.txt',
        General_Category: gc,
        Script: sc,
        Script_Extensions: scx,
      },
      undefined,
      2,
    ),
    'utf-8',
  );
}

await Promise.all([
  writeUnicodePropertyMapping(),
  writeUnicodeStringsMapping(),
  writeUnicodePropertyAliasMapping(),
]);
