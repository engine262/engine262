import { type Value, type ValueEvaluator } from '#self';

export function* transformed(value: Value): ValueEvaluator {
  yield { suspend: 'await' };
  return value;
}
