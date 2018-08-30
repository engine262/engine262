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
print(\`0 \${a} 2 ${3}\`);
`);

console.log(completion);
