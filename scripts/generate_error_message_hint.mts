/* eslint-disable no-console */
import { opendir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  createSourceFile, isCallExpression, isIdentifier, isPropertyAccessExpression, isStringLiteral, ScriptTarget,
} from 'typescript';

async function* readdir(dir: string): AsyncGenerator<string> {
  for await (const dirent of await opendir(dir)) {
    const p = join(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* readdir(p);
    } else {
      yield p;
    }
  }
}

const list = ['EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'Error', 'AggregateError'];
const messages = new Set<string>();
const promises: Promise<void>[] = [];
for await (const filePath of readdir(join(import.meta.dirname, '../src/'))) {
  if (!filePath.endsWith('.mts')) {
    continue;
  }
  promises.push(readFile(filePath, 'utf8').then((content) => {
    const sourceFile = createSourceFile(filePath, content, {
      languageVersion: ScriptTarget.ESNext,
    });
    sourceFile.forEachChild(function visitor(node) {
      if (
        isCallExpression(node)
        && isPropertyAccessExpression(node.expression)
        && isIdentifier(node.expression.expression)
        && node.expression.expression.escapedText === 'Throw'
        && isIdentifier(node.expression.name)
        && list.includes(node.expression.name.escapedText as string)
        && node.arguments.length >= 1
      ) {
        if (!isStringLiteral(node.arguments[0])) {
          console.warn(`Non-literal error message in ${filePath}`);
        } else {
          messages.add(node.arguments[0].text);
        }
      }
      node.forEachChild(visitor);
    });
  }));
}

await Promise.all(promises);

const sortedMessages = Array.from(messages).sort();

const old = await readFile(join(import.meta.dirname, '../src/host-defined/error-messages.mts'), 'utf8');

const autoGenStart = '// auto-generate start';
const autoGenEnd = '// auto-generate end';

const beforeAutoGen = old.slice(0, old.indexOf(autoGenStart) + autoGenStart.length);
const afterAutoGen = old.slice(old.indexOf(autoGenEnd));

const messagesByParameterCount: string[][] = [];
sortedMessages.forEach((m) => {
  // const paramCount = (m.match(/\$\d+/g) || []).length;
  // const params = Array.from({ length: paramCount }, (_, i) => `$${i + 1}: Formattable`).join(', ');
  // return `  (m: '${m}'${params ? `, ${params}` : ''}): ThrowCompletion;`;
  if (m.includes('$3')) {
    messagesByParameterCount[3] ??= [];
    messagesByParameterCount[3].push(m);
  } else if (m.includes('$2')) {
    messagesByParameterCount[2] ??= [];
    messagesByParameterCount[2].push(m);
  } else if (m.includes('$1')) {
    messagesByParameterCount[1] ??= [];
    messagesByParameterCount[1].push(m);
  } else {
    messagesByParameterCount[0] ??= [];
    messagesByParameterCount[0].push(m);
  }
});

const generatedLines: string[] = [];
messagesByParameterCount.forEach((group, index) => {
  const args: string[] = [group.map((m) => (m.includes("'") ? `"${m}"` : `'${m}'`)).join(' | '), ...Array(index).fill('Formattable').map((t, i) => `$${i + 1}: ${t}`)];
  generatedLines.push(`  (m: ${args.join(', ')}): ThrowCompletion;`);
});
const generated = generatedLines.join('\n');

const newFileContent = `${beforeAutoGen}
${generated}
  ${afterAutoGen}`;

if (newFileContent !== old) {
  console.log('Updating error-messages.mts');
  await writeFile(
    join(import.meta.dirname, '../src/host-defined/error-messages.mts'),
    newFileContent,
  );
} else {
  console.log('error-messages.mts is up to date');
}
