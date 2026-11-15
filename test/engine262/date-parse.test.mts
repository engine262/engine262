import { expect, test } from 'vitest';
import {
  Agent, JSStringValue, ManagedRealm, NormalCompletion, setSurroundingAgent,
} from '#self';

function parse(strings: string[]) {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  const source = `JSON.stringify(${JSON.stringify(strings)}.map((s) => String(Date.parse(s))))`;
  const result = realm.evaluateScriptSkipDebugger(source);
  if (!(result instanceof NormalCompletion) || !(result.Value instanceof JSStringValue)) {
    throw new Error(`Expected a string, got ${String(result)}`);
  }
  return JSON.parse(result.Value.stringValue()).map(Number);
}

// https://tc39.es/ecma262/#sec-date.parse
test('strings produced by toString, toUTCString and toDateString', () => {
  expect(parse([
    'Thu May 06 2021 07:08:09 GMT+0000',
    'Thu, 06 May 2021 07:08:09 GMT',
    'Thu May 06 2021',
    'Mon Jan 01 -0500 00:00:00 GMT+0000',
    'Mon, 01 Jan -0500 00:00:00 GMT',
    'Thu Jan 01 1970 00:00:00 GMT+0000 (Coordinated Universal Time)',
  ])).toEqual([1620284889000, 1620284889000, 1620259200000, -77945673600000, -77945673600000, 0]);
});

test('the UTC offset of a non-ISO string is applied', () => {
  expect(parse([
    'Thu Jan 01 1970 00:00:00 GMT+0100',
    'Thu Jan 01 1970 00:00:00 GMT-0130',
  ])).toEqual([-3600000, 5400000]);
});

test('out-of-range values and unknown text give NaN', () => {
  expect(parse([
    '2020-13-01',
    '2020-00-01',
    '2020-01-32',
    '2020-02-30',
    '2020-01-01T25:00Z',
    '2020-01-01T23:60Z',
    'Thu Jan 32 1970 00:00:00 GMT',
    'Mon Feb 30 2021 00:00:00 GMT',
    'Thu Jan 01 1970 25:00:00 GMT',
    'Thu Jan 01 1970 00:61:00 GMT',
    'hello 1999 world',
  ])).toEqual(Array(11).fill(NaN));
});

// https://tc39.es/ecma262/#sec-date-time-string-format
test('date-only forms YYYY and YYYY-MM', () => {
  expect(parse([
    '1970',
    '2020-05',
    '+002020-05',
    '2020-05T10:00:30.123Z',
    '2020-05T10:00+05:30',
    '2020-13',
    '-000000',
  ])).toEqual([0, 1588291200000, 1588291200000, 1588327230123, 1588307400000, NaN, NaN]);
});
