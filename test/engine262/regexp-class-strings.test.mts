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

// https://tc39.es/ecma262/#sec-compiletocharset
// ClassString :: [empty] is the empty sequence of characters, and
// CompileAtom appends EmptyMatcher() when the class contains it.
test('class strings may be empty', () => {
  expect(testAll([
    ['^[\\q{}]$', 'v', ''],
    ['^[\\q{|a}]$', 'v', ''],
    ['^[\\q{a|}]$', 'v', ''],
    ['^[\\q{a|}]$', 'v', 'a'],
    ['^[a\\q{}]$', 'v', ''],
    ['^x[\\q{|ab}]y$', 'v', 'xy'],
    ['^x[\\q{|ab}]y$', 'v', 'xaby'],
    ['^[[\\q{}a]--[a]]$', 'v', ''],
    ['^[[\\q{}a]--[\\q{}]]$', 'v', ''],
    ['^[\\q{}]$', 'iv', ''],
    ['(?<=x[\\q{|ab}])y$', 'v', 'xy'],
  ])).toEqual([true, true, true, true, true, true, true, true, false, true, true]);
  expect(evaluate('JSON.stringify("xay".replace(/[\\q{}]/gv, "-"))')).toBe('-x-a-y-');
});

// https://tc39.es/ecma262/#sec-compileatom
// "Let cs2 be a one-element CharSet containing the last code point of s."
test('class strings that end in a supplementary code point', () => {
  expect(testAll([
    ['^[\\p{RGI_Emoji}]$', 'v', '\u{1F44D}\u{1F3FD}'],
    ['^[\\p{RGI_Emoji}]$', 'v', '\u{1F1EB}\u{1F1F7}'],
    ['^[\\q{\u{1F600}\u{1F600}}]$', 'v', '\u{1F600}\u{1F600}'],
    ['^[\\q{a\u{1F600}}]$', 'v', 'a\u{1F600}'],
    ['^[\\q{\u{1F600}\u{1F600}}]$', 'iv', '\u{1F600}\u{1F600}'],
    ['(?<=[\\q{\u{1F600}\u{1F600}}])x', 'v', '\u{1F600}\u{1F600}x'],
    ['^[\\q{\u{1F600}a}]$', 'v', '\u{1F600}a'],
  ])).toEqual([true, true, true, true, true, true, true]);
});
