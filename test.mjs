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

const a = 1;
let b = 3;

try {
  a = 2;
} catch (e) {
  print(e.name);
}

b **= '3';

print(a);
print(\`0
\${a}\\n2\\x0a\${3}\`);

const c = { ...({ b, d: { a: 1 } }) };

print('c.b', c.b);

print(c.d);

print(Object.prototype.toString.call(1));
`);

console.log(completion); // eslint-disable-line no-console
