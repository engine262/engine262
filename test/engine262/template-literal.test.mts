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

// https://tc39.es/ecma262/#sec-static-semantics-tv
test('template literal escapes in the middle of a span', () => {
  expect(evaluate('JSON.stringify([`a\\0b`, `a\\0b${1}c\\0d`])'))
    .toEqual(['a\0b', 'a\0b1c\0d']);
});

test('line continuations in template literals', () => {
  expect(evaluate('JSON.stringify([`ab\\\ncd`, `x${`a\\\nb`}y`, `ab\\\r\ncd`, `ab\\\rcd`, `ab\\ cd`, `ab\\ cd`])'))
    .toEqual(['abcd', 'xaby', 'abcd', 'abcd', 'abcd', 'abcd']);
});

test('NonEscapeCharacter in template literals', () => {
  expect(evaluate('JSON.stringify([`a\\{b`, `\\a\\c\\%`, `\\\u{1F600}`])'))
    .toEqual(['a{b', 'ac%', '\u{1F600}']);
});

test('cooked strings of tagged templates', () => {
  expect(evaluate(`
    function tag(s) { return [...s, ...s.raw]; }
    JSON.stringify(tag\`a\\0b\\\nc\\{d\`)
  `)).toEqual(['a\0bc{d', 'a\\0b\\\nc\\{d']);
});

test('invalid escapes in tagged templates cook to undefined', () => {
  expect(evaluate(`
    function tag(s) { return s[0] === undefined ? s.raw[0] : 'cooked: ' + s[0]; }
    JSON.stringify([tag\`\\u{g}\`, tag\`\\u{}\`, tag\`\\u{}}\`, tag\`\\u{110000}\`, tag\`\\1\`, tag\`\\01\`, tag\`\\xg1\`, tag\`\\u004\`])
  `)).toEqual(['\\u{g}', '\\u{}', '\\u{}}', '\\u{110000}', '\\1', '\\01', '\\xg1', '\\u004']);
});
