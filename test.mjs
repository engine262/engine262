import { NonSpecRunScript } from './lib/engine.mjs';

/*
[
  'try { throw new Error("hi!"); } catch (e) { print(e.message); }',
  'print(ReferenceError.name);',
].forEach((sourceText) => {
  NonSpecRunScript(sourceText);
});
*/

const completion = NonSpecRunScript(`
'use strict';

const a = [1, { a: 1 }, 2];

print(a[0]);
print(a[1]);
print(a.length);

// const b = [2, ...a];
// print(b[1]);
`);

console.log(completion); // eslint-disable-line no-console
