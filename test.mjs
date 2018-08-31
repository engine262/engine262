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

const a = [1, 2, { a: 1 }];

try {
  a.length = 3;

  print(a[0], a[1], a[2], a.length);
} catch (e) {
  print(e);
}
`);

console.log(completion); // eslint-disable-line no-console
