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

// Capturing groups are numbered by their left parentheses (CountLeftCapturingParensBefore),
// so a group name belongs to the group that opens first, not the one that closes first.
test('nested named groups get their own names', () => {
  expect(evaluate('JSON.stringify(/(?<a>.(?<b>.))/.exec("xy").groups)'))
    .toEqual({ a: 'xy', b: 'y' });
  expect(evaluate('JSON.stringify(/(?<a>.(?<b>.(?<c>.)))/d.exec("bab").indices.groups)'))
    .toEqual({ a: [0, 3], b: [1, 3], c: [2, 3] });
});

test('named group nested in an unnamed group', () => {
  expect(evaluate('JSON.stringify(/((?<a>x)y)/.exec("xy").groups)'))
    .toEqual({ a: 'x' });
  expect(evaluate('JSON.stringify(/(?:(x)(?<a>y))((?<b>z))/.exec("xyz").groups)'))
    .toEqual({ a: 'y', b: 'z' });
});

test('$<name> in replace uses the right group', () => {
  expect(evaluate('JSON.stringify("xy".replace(/(?<a>(?<b>x)y)/, "[$<a>|$<b>]"))'))
    .toEqual('[xy|x]');
});

test('sequential named groups are unchanged', () => {
  expect(evaluate('JSON.stringify(/(?<a>.)(?<b>.)/.exec("xy").groups)'))
    .toEqual({ a: 'x', b: 'y' });
});

test('duplicate named groups are still checked', () => {
  expect(evaluate(`
    const r = [];
    for (const s of ['(?<a>x)(?<a>y)', '(?<a>x)|(?<a>y)', '((?<a>x)|(?<a>y))(?<b>z)', '(?<a>x)|((?<a>y))']) {
      try { new RegExp(s); r.push('ok'); } catch (e) { r.push(e.constructor.name); }
    }
    JSON.stringify(r);
  `)).toEqual(['SyntaxError', 'ok', 'ok', 'ok']);
});
