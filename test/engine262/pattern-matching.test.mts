import { expect, test } from 'vitest';
import { createAgent, createRealm } from '../base.mts';
import {
  NormalCompletion,
  ThrowCompletion,
  UndefinedValue,
  Value,
  setSurroundingAgent,
} from '#self';

function evaluate(source: string, enabled = true) {
  setSurroundingAgent(createAgent({
    features: enabled ? ['pattern-matching'] : [],
  }));
  return createRealm().realm.evaluateScriptSkipDebugger(source);
}

function expectPass(source: string) {
  const result = evaluate(source);
  expect(result).toBeInstanceOf(NormalCompletion);
  expect((result as NormalCompletion<UndefinedValue>).Value).toBe(Value.undefined);
}

test('primitive, unary, relational, and combined patterns', () => {
  expectPass(`
    if (!(NaN is NaN)) throw new Error('NaN');
    if (+0 is -0) throw new Error('signed zero');
    if (!(5 is > 1 and < 10)) throw new Error('and');
    if (!(5 is 0 or 5)) throw new Error('or');
    if (!(5 is not 6)) throw new Error('not');
    if (!('x' is === 'x')) throw new Error('strict');
    const object = { x: 1 };
    if (!('x' is in object)) throw new Error('in');
  `);
});

test('object patterns cache access and expose successful bindings', () => {
  expectPass(`
    let gets = 0;
    const subject = {
      get x() { gets += 1; return 1; },
      y: 2,
      z: 3,
    };
    if (!(subject is { x: 1, let y } and { x: 1 })) throw new Error('match');
    if (gets !== 1) throw new Error('getter cache');
    if (y !== 2) throw new Error('binding');
    if (!(subject is { missing?: 0 })) throw new Error('optional');
    if (!(subject is { x: 1, ...let rest })) throw new Error('rest');
    if (rest.y !== 2 || rest.z !== 3 || 'x' in rest) throw new Error('rest value');
  `);
});

test('array patterns reuse iterator values and close iterators', () => {
  expectPass(`
    let nextCount = 0;
    let returnCount = 0;
    const iterable = {
      [Symbol.iterator]() {
        let i = 0;
        return {
          next() { nextCount += 1; return { value: ++i, done: false }; },
          return() { returnCount += 1; return {}; },
        };
      },
    };
    if (!(iterable is [1, ...] and [1, 2, ...])) throw new Error('match');
    if (nextCount !== 2) throw new Error('iterator cache');
    if (returnCount !== 1) throw new Error('iterator close');

    if (!([1] is [1, 2?])) throw new Error('optional element');
    if (!([1, 2, 3] is [let head, ...let tail])) throw new Error('rest element');
    if (head !== 1 || tail.length !== 2 || tail[0] !== 2) throw new Error('rest binding');
  `);
});

test('custom matchers receive hints and member receivers', () => {
  expectPass(`
    let booleanCalls = 0;
    const holder = {
      matcher: {
        [Symbol.customMatcher](subject, hint, receiver) {
          booleanCalls += 1;
          return subject === 4 && hint === 'boolean' && receiver === holder;
        },
      },
    };
    if (!(4 is holder.matcher)) throw new Error('boolean matcher');
    if (booleanCalls !== 1) throw new Error('boolean calls');

    const pair = {
      [Symbol.customMatcher](subject, hint) {
        if (hint !== 'list' || subject !== 5) return false;
        return [2, 3];
      },
    };
    if (!(5 is pair(2, let value))) throw new Error('list matcher');
    if (value !== 3) throw new Error('list binding');
  `);
});

test('match expressions select clauses and scope clause bindings', () => {
  expectPass(`
    const result = match ({ op: 'add', lhs: 2, rhs: 3 }) {
      { op: 'sub', let lhs, let rhs }: lhs - rhs;
      { op: 'add', let lhs, let rhs }: lhs + rhs;
      default: 0;
    };
    if (result !== 5) throw new Error('selected clause');
    const fallback = match (0) { 1: 'one'; default: 'other'; };
    if (fallback !== 'other') throw new Error('default clause');
    let threw = false;
    try { match (0) { 1: 'one'; }; } catch (error) { threw = error instanceof TypeError; }
    if (!threw) throw new Error('unmatched');
  `);
});

test('built-in custom matchers', () => {
  expectPass(`
    if (!({} is Object)) throw new Error('Object');
    if (!(function () {} is Function)) throw new Error('Function');
    if (!([1, 2] is Array(1, 2))) throw new Error('Array');
    if (!(new Number(2) is Number(2))) throw new Error('Number');
    if (!('abc' is /b/)) throw new Error('RegExp');
    if (!(new Date() is Date)) throw new Error('Date');
    if (!(new TypeError() is TypeError)) throw new Error('TypeError');
    if (new Error() is TypeError) throw new Error('Error kind');
    if (!(new Map() is Map)) throw new Error('Map');
    if (!(Promise.resolve() is Promise)) throw new Error('Promise');
  `);
});

test('FinishMatch combines iterator close errors', () => {
  expectPass(`
    const matcher = message => ({
      [Symbol.customMatcher]() {
        return {
          [Symbol.iterator]() {
            return {
              next() { return { value: 1, done: false }; },
              return() { throw new Error(message); },
            };
          },
        };
      },
    });
    const a = matcher('a');
    const b = matcher('b');
    let combined = false;
    try { 0 is a(...) and b(...); } catch (error) {
      combined = error instanceof AggregateError
        && error.errors.length === 2
        && error.errors[0].message === 'a'
        && error.errors[1].message === 'b';
    }
    if (!combined) throw new Error('close errors');
  `);
});

test('early errors and feature gating', () => {
  for (const source of [
    '0 is 0 and 0 or 0;',
    '0 is not not 0;',
    '0 is { value };',
    'match (0) { 0: 1 }',
    '0 is { __proto__: null };',
  ]) {
    expect(evaluate(source)).toBeInstanceOf(ThrowCompletion);
  }
  expect(evaluate('0 is 0;', false)).toBeInstanceOf(ThrowCompletion);
  const symbolResult = evaluate('Symbol.customMatcher;', false);
  expect(symbolResult).toBeInstanceOf(NormalCompletion);
  expect((symbolResult as NormalCompletion<UndefinedValue>).Value).toBe(Value.undefined);
});
