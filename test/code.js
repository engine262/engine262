'use strict';

Promise.resolve({
  a: 1,
  b: [2],
  c: Symbol('3'),
  d: { e: 4 },
}).then(print);

throw new Error('test');
