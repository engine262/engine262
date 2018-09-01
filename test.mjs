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

try {
  ((a) => { print(a); })('aaa');
} catch (e) {
  print(e);
}
`);

console.log(completion); // eslint-disable-line no-console
