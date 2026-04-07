/* eslint-disable no-await-in-loop */
/* eslint-disable quotes */
import * as babel from '@babel/core';
import { expect, test } from 'vitest';
import transformer from '../../scripts/transform.mts';

function compile(comment: string, file: string) {
  const result = babel.transform(file, { plugins: [transformer], sourceMaps: true });
  expect(result?.code).toMatchSnapshot(comment);
  expect(JSON.stringify(result?.map, undefined, 2)).toMatchSnapshot(`${comment} source map`);
}

// TODO: tests:
// Macro failure case
// Rest Macros with () => ...
// X
// IfAbruptCloseIterator and IfAbruptCloseAsyncIterator
// IfAbruptRejectPromise

test('function.section', () => {
  compile('case', `
    /** https://tc39.es/ecma262/#sec-test */
    function Test() {}
    /** https://tc39.es/ecma262/#sec-test */
    export function Test2() {}
    /** https://tc39.es/ecma262/#sec-test */
    const Test5 = function () {}
    /** https://tc39.es/ecma262/#sec-test */
    const Test6 = () => {}

    // Not supported yet
    /** https://tc39.es/ecma262/#sec-test */
    export const Test3 = function () {}
    /** https://tc39.es/ecma262/#sec-test */
    export const Test4 = () => {}
  `);
});

test('Assert with source code', () => {
  compile('case', `
    // optimized
    Assert(expr + expr2);
    // unoptimized
    Assert(expr) || true;
  `);
});

test('Struct optimization', () => {
  compile('case', `
    const val = AsyncGeneratorRequestRecord({ Value: 1 });
  `);
});

test('Completion optimization', () => {
  compile('case', `
    const value1 = _;
    // normal
    const value2 = NormalCompletion({ Value: 1 });
    // nested
    const value3 = NormalCompletion(Q(value1));
  `);
});

test('transform OutOfRange', () => {
  compile('case', `
    function f() { throw OutOfRange.exhaustive('message'); }
    switch (key) {
      case value:
        break;
      default:
        throw OutOfRange.nonExhaustive(key);
    }
  `);
});


test('transform Q() correctly', () => {
  compile('value', `
    let value;
    const x = Q(value);
  `);
  compile('complex', `
    let value;
    const completion = Apply(Q(Call(value)), Q(Call(value)));
  `);
  compile('statement', `
    let value;
    Q(value);
  `);
  compile('return', `
    function f() {
      let value;
      return Q(value);
    }
  `);
  compile('return arrow', `
    let value;
    const f = () => Q(value);
  `);
});

test('transform X() correctly', () => {
  compile('value', `
    let value;
    const x = X(value);
  `);
  compile('complex', `
    let value;
    Apply(X(Call(value)));
  `);
  compile('statement', `
    const value = 1;
    X(value);
  `);
  compile('return', `
    function f() {
      let value;
      return X(value);
    }
  `);
  compile('condition', `
    function f() {
      let value;
      if (test) return X(value.compute());
    }
  `);
});

test('transform simple ternary', () => {
  compile('case', `
    let value, error;
    const x = condition ? Q(value) : (error);
  `);
});

test('transform Throw() correctly', () => {
  compile('case', `
    function f(value) {
      Throw(value);
    }
  `);

  compile('direct return', `
    function f(value) {
      return Throw(value);
    }
    const f2 = value => Throw(value);
  `);
});
