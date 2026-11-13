import { expect, test } from 'vitest';
import {
  Agent, JSStringValue, ManagedRealm, NormalCompletion, setSurroundingAgent,
} from '#self';

function evaluate(source: string) {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  const result = realm.evaluateScriptSkipDebugger(source);
  if (!(result instanceof NormalCompletion) || !(result.Value instanceof JSStringValue)) {
    throw new Error(`Expected a string, got ${String(result)}`);
  }
  return JSON.parse(result.Value.stringValue());
}

function testAll(cases: readonly (readonly [pattern: string, flags: string, input: string])[]) {
  return evaluate(`JSON.stringify(${JSON.stringify(cases)}.map(([p, f, s]) => new RegExp(p, f).test(s)))`);
}

// https://tc39.es/ecma262/#sec-allcharacters
// With v and i, AllCharacters is the code points c with scf(c) = c.
test('complemented classes with the v and i flags', () => {
  expect(testAll([
    ['^[^a]$', 'iv', 'A'],
    ['^[^a]$', 'iv', 'a'],
    ['^[^a]$', 'iv', 'b'],
    ['^[^a]$', 'iv', 'B'],
    ['^[^\\q{a}]{2}$', 'iv', 'Ab'],
    ['^[^\\q{a}]{2}$', 'iv', 'Bb'],
    ['^\\P{Lowercase}$', 'iv', 'A'],
    ['^[^\\d]$', 'iv', 'K'],
  ])).toEqual([false, false, true, true, false, true, false, true]);
});

// https://tc39.es/ecma262/#sec-maybesimplecasefolding
// MaybeSimpleCaseFolding maps every member through scf, so [^A] complements {a}.
test('complemented classes whose members do not fold to themselves', () => {
  expect(testAll([
    ['^[^A]$', 'iv', 'A'],
    ['^[^A]$', 'iv', 'a'],
    ['^[^\\q{A}]$', 'iv', 'A'],
    ['^[^\\u212A]$', 'iv', 'k'],
    ['^[^\\u212A]$', 'iv', 'K'],
    ['^[^\\q{\\u212A}]$', 'iv', 'K'],
    ['^[^A-C]$', 'iv', 'b'],
    ['^[^A-C]$', 'iv', 'D'],
    ['^[^[A-C]--B]$', 'iv', 'b'],
    ['^[^[A-C]--B]$', 'iv', 'a'],
  ])).toEqual([false, false, false, false, false, false, false, true, true, false]);
});

test('non-complemented classes with the v and i flags are unchanged', () => {
  expect(testAll([
    ['^[A]$', 'iv', 'a'],
    ['^[a]$', 'iv', 'A'],
    ['^[\\u212A]$', 'iv', 'k'],
    ['^[A-C]$', 'iv', 'b'],
    ['^[^a]$', 'i', 'A'],
    ['^[^a]$', 'iu', 'A'],
    ['^[^a]$', 'v', 'A'],
  ])).toEqual([true, true, true, true, false, false, true]);
});
